/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
  create: context => {
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
          .filter(node => licenses.includes(normalizeWhitespace(node.value)))
          .forEach(node => {
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
