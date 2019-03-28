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

function checkModuleNameNode(context, mappings, node) {
  const mapping = mappings.find(
    mapping => mapping.from === node.value || mapping.from.startsWith(node.value + '/')
  );

  if (!mapping) {
    return;
  }

  const newSource = node.value.replace(mapping.from, mapping.to);
  context.report({
    message: `Imported module "${node.value}" should be "${newSource}"`,
    loc: node.loc,
    fix(fixer) {
      return fixer.replaceText(node, `'${newSource}'`);
    },
  });
}

module.exports = {
  meta: {
    fixable: 'code',
    schema: [
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
            },
            to: {
              type: 'string',
            },
          },
          required: ['from', 'to'],
          additionalProperties: false,
        },
        default: [],
        minItems: 1,
      },
    ],
  },
  create: context => {
    const mappings = context.options[0];

    return {
      ImportDeclaration(node) {
        checkModuleNameNode(context, mappings, node.source);
      },
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal'
        ) {
          checkModuleNameNode(context, mappings, node.arguments[0]);
        }
      },
    };
  },
};
