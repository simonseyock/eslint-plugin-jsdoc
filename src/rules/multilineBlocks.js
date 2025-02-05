import iterateJsdoc from '../iterateJsdoc';

export default iterateJsdoc(({
  context,
  indent,
  jsdoc,
  utils,
}) => {
  const {
    allowMultipleTags = true,
    noZeroLineText = true,
    noSingleLineBlocks = false,
    singleLineTags = ['lends', 'type'],
    noMultilineBlocks = false,
    minimumLengthForMultiline = Number.POSITIVE_INFINITY,
    multilineTags = ['*'],
  } = context.options[0] || {};

  const {source: [{tokens}]} = jsdoc;
  const {postDelimiter, description, tag, name, type} = tokens;
  const sourceLength = jsdoc.source.length;

  const emptyTokens = () => {
    [
      'start',
      'postDelimiter',
      'tag',
      'type',
      'postType',
      'postTag',
      'name',
      'postName',
      'description',
      'end',
    ].forEach((prop) => {
      tokens[prop] = '';
    });
  };

  const isInvalidSingleLine = (tagName) => {
    return noSingleLineBlocks &&
      (!tagName ||
      !singleLineTags.includes(tagName) && !singleLineTags.includes('*'));
  };

  if (sourceLength === 1) {
    if (!isInvalidSingleLine(tag.slice(1))) {
      return;
    }

    const fixer = () => {
      let {tokens: {
        postName, postTag, postType,
      }} = jsdoc.source[0];

      // Strip trailing leftovers from single line ending
      if (!description) {
        if (postName) {
          postName = '';
        } else if (postType) {
          postType = '';
        // eslint-disable-next-line max-len, no-inline-comments
        } else /* istanbul ignore else -- `comment-parser` prevents empty blocks currently per https://github.com/syavorsky/comment-parser/issues/128 */ if (postTag) {
          postTag = '';
        }
      }

      emptyTokens();

      utils.addLine(1, {
        delimiter: '*',

        // If a description were present, it may have whitespace attached
        //   due to being at the end of the single line
        description: description.trimEnd(),
        name,
        postDelimiter,
        postName,
        postTag,
        postType,
        start: indent + ' ',
        tag,
        type,
      });
      utils.addLine(2, {
        end: '*/',
        start: indent + ' ',
      });
    };

    utils.reportJSDoc(
      'Single line blocks are not permitted by your configuration.',
      null, fixer, true,
    );

    return;
  }

  if (noMultilineBlocks) {
    if (
      jsdoc.tags.length &&
      (multilineTags.includes('*') || utils.hasATag(multilineTags))
    ) {
      return;
    }

    if (jsdoc.description.length >= minimumLengthForMultiline) {
      return;
    }

    if (
      noSingleLineBlocks &&
      (!jsdoc.tags.length ||
      !utils.filterTags(({tag: tg}) => {
        return !isInvalidSingleLine(tg);
      }).length)
    ) {
      utils.reportJSDoc(
        'Multiline jsdoc blocks are prohibited by ' +
          'your configuration but fixing would result in a single ' +
          'line block which you have prohibited with `noSingleLineBlocks`.',
      );
    } else if (jsdoc.tags.length > 1) {
      if (allowMultipleTags) {
        return;
      }
      utils.reportJSDoc(
        'Multiline jsdoc blocks are prohibited by ' +
          'your configuration but the block has multiple tags.',
      );
    } else if (jsdoc.tags.length === 1 && jsdoc.description.trim()) {
      if (allowMultipleTags) {
        return;
      }
      utils.reportJSDoc(
        'Multiline jsdoc blocks are prohibited by ' +
          'your configuration but the block has a description with a tag.',
      );
    } else {
      const fixer = () => {
        jsdoc.source = [{
          number: 1,
          source: '',
          tokens: jsdoc.source.reduce((obj, {
            tokens: {
              description: desc, tag: tg, type: typ, name: nme,
              postType, postName, postTag,
            },
          }, idx, arr) => {
            if (typ) {
              obj.type = typ;
            }
            if (tg && typ && nme) {
              obj.postType = postType;
            }
            if (nme) {
              obj.name += nme;
            }
            if (nme && desc) {
              obj.postName = postName;
            }
            obj.description += desc;

            if ((obj.name || obj.description) && idx === arr.length - 1) {
              obj.description += ' ';
            }

            // Already filtered for multiple tags
            obj.tag += tg;
            if (tg) {
              obj.postTag = postTag || ' ';
            }

            return obj;
          }, utils.seedTokens({
            delimiter: '/**',
            description: '',
            end: '*/',
            postDelimiter: ' ',
            tag: '',
          })),
        }];
      };
      utils.reportJSDoc(
        'Multiline jsdoc blocks are prohibited by ' +
          'your configuration.',
        null, fixer,
      );
    }

    return;
  }

  if (
    noZeroLineText &&
    (tag || description)
  ) {
    const fixer = () => {
      const line = {...tokens};
      emptyTokens();
      const {tokens: {delimiter, start}} = jsdoc.source[1];
      utils.addLine(1, {...line, delimiter, start});
    };
    utils.reportJSDoc(
      'Should have no text on the "0th" line (after the `/**`).',
      null, fixer,
    );
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Controls how and whether jsdoc blocks can be expressed as single or multiple line blocks.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc#eslint-plugin-jsdoc-rules-multiline-blocks',
    },
    fixable: 'code',
    schema: [
      {
        additionalProperies: false,
        properties: {
          allowMultipleTags: {
            type: 'boolean',
          },
          minimumLengthForMultiline: {
            type: 'integer',
          },
          multilineTags: {
            anyOf: [
              {
                enum: ['*'],
                type: 'string',
              }, {
                items: {
                  type: 'string',
                },
                type: 'array',
              },
            ],
          },
          noMultilineBlocks: {
            type: 'boolean',
          },
          noSingleLineBlocks: {
            type: 'boolean',
          },
          noZeroLineText: {
            type: 'boolean',
          },
          singleLineTags: {
            items: {
              type: 'string',
            },
            type: 'array',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
