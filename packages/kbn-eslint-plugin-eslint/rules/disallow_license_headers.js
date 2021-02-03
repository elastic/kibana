/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const babelEslint = require('babel-eslint');

const { assert, normalizeWhitespace, init } = require('../lib');

module.exports = {
  meta: {
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          licenses: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create: (context) => {
    return {
      Program(program) {
        const licenses = init(context, program, () => {
          const options = context.options[0] || {};
          const licenses = options.licenses;

          assert(!!licenses, '"licenses" option is required');

          return licenses.map((license, i) => {
            const parsed = babelEslint.parse(license);

            assert(
              !parsed.body.length,
              `"licenses[${i}]" option must only include a single comment`
            );
            assert(
              parsed.comments.length === 1,
              `"licenses[${i}]" option must only include a single comment`
            );

            return normalizeWhitespace(parsed.comments[0].value);
          });
        });

        if (!licenses || !licenses.length) return;

        const sourceCode = context.getSourceCode();

        sourceCode
          .getAllComments()
          .filter((node) => licenses.includes(normalizeWhitespace(node.value)))
          .forEach((node) => {
            context.report({
              node,
              message: 'This license header is not allowed in this file.',
              fix(fixer) {
                return fixer.remove(node);
              },
            });
          });
      },
    };
  },
};
