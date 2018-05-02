const babelEslint = require('babel-eslint');

const { assert, normalizeWhitespace, init } = require('../lib');

module.exports = {
  meta: {
    fixable: 'code',
    schema: [{
      type: 'object',
      properties: {
        licenses: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
      },
      additionalProperties: false,
    }]
  },
  create: context => {
    return {
      Program(program) {
        const nodeValues = init(context, program, () => {
          const options = context.options[0] || {};
          const licenses = options.licenses;

          assert(!!licenses, '"licenses" option is required');

          return licenses.map((license, i) => {
            const parsed = babelEslint.parse(license);

            assert(!parsed.body.length, `"licenses[${i}]" option must only include a single comment`);
            assert(parsed.comments.length === 1, `"licenses[${i}]" option must only include a single comment`);

            return normalizeWhitespace(parsed.comments[0].value);
          });
        });

        if (!nodeValues) return;

        const sourceCode = context.getSourceCode();

        sourceCode
          .getAllComments()
          .filter(node => (
            nodeValues.find(nodeValue => (
              normalizeWhitespace(node.value) === nodeValue
            ))
          ))
          .forEach(node => {
            context.report({
              node,
              message: 'Remove outdated license header.',
              fix(fixer) {
                return fixer.remove(node);
              }
            });
          });
      },
    };
  }
};
