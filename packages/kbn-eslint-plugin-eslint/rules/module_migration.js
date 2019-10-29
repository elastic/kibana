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

const Path = require('path');
const { REPO_ROOT } = require('@kbn/dev-utils');

function checkModuleNameRelative(context, mappings, node) {
  const requestAbsolute = Path.resolve(Path.dirname(context.getFilename()), node.value);
  const mapping = mappings.find(
    mapping => Path.isAbsolute(mapping.from) && requestAbsolute.startsWith(mapping.from)
  );

  if (!mapping) {
    return;
  }

  context.report({
    message: `Relative imports to "${Path.relative(REPO_ROOT, mapping.from)}" is not allowed`,
    loc: node.loc,
    fix(fixer) {
      const subReq = requestAbsolute.replace(mapping.from, '').replace(/\\/g, '/');
      return fixer.replaceText(node, subReq ? `'${mapping.to}${subReq}'` : mapping.to);
    },
  });
}

function checkModuleNameNode(context, mappings, node) {
  if (node.value.startsWith('../') || node.value.startsWith('./')) {
    return checkModuleNameRelative(context, mappings, node);
  }

  const mapping = mappings.find(
    mapping => mapping.from === node.value || node.value.startsWith(`${mapping.from}/`)
  );

  if (!mapping) {
    return;
  }

  let newSource;

  if (mapping.to === false) {
    context.report({
      message: mapping.disallowedMessage || `Importing "${mapping.from}" is not allowed`,
      loc: node.loc,
    });
    return;
  }

  // support for toRelative added to migrate away from X-Pack being bundled
  // within node modules. after that migration, this can be removed.
  if (mapping.toRelative) {
    const sourceDirectory = Path.dirname(context.getFilename());
    const localModulePath = node.value.replace(new RegExp(`^${mapping.from}\/`), '');
    const modulePath = Path.resolve(REPO_ROOT, mapping.toRelative, localModulePath);
    const relativePath = Path.relative(sourceDirectory, modulePath);

    newSource = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
  } else {
    newSource = node.value.replace(mapping.from, mapping.to);
  }

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
              anyOf: [
                {
                  type: 'string',
                },
                {
                  const: false,
                },
              ],
            },
            toRelative: {
              type: 'string',
            },
            disallowedMessage: {
              type: 'string',
            },
          },
          anyOf: [
            {
              required: ['from', 'to'],
            },
            {
              required: ['from', 'toRelative'],
            },
          ],
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
