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

const fwdSlash = path => path.split('\\').join('/');

const first = (list, property, test) => {
  for (const item of list) {
    if (item[property] && test(item[property])) {
      return item[property];
    }
  }
};

function checkRelativeToNamed(context, mappings, node) {
  if (node.parent.type !== 'ImportDeclaration' && !node.parent.type.startsWith('Export')) {
    return;
  }

  const fileDir = Path.dirname(context.getFilename());
  const request = node.value;
  const requestAbsolute = Path.resolve(fileDir, request);

  const relativeToNamed = first(
    mappings,
    'relativeToNamed',
    ({ directory }) =>
      requestAbsolute.startsWith(directory) &&
      request.startsWith(fwdSlash(Path.relative(fileDir, directory)))
  );

  if (!relativeToNamed) {
    return;
  }

  const { directory, name } = relativeToNamed;
  const newRequest = fwdSlash(Path.join(name, Path.relative(directory, requestAbsolute)));
  context.report({
    message: `Relative import to "${Path.relative(
      REPO_ROOT,
      directory
    )}" are not allowed, use "${newRequest}" instead.`,
    loc: node.loc,
    fix(fixer) {
      return fixer.replaceText(node, `'${newRequest}'`);
    },
  });
}

function checkModuleNameNode(context, mappings, node) {
  if (node.value.startsWith('../') || node.value.startsWith('./')) {
    checkRelativeToNamed(context, mappings, node);
    return;
  }

  const disallow = first(
    mappings,
    'disallow',
    ({ name }) => node.value === name || node.value.startsWith(`${name}/`)
  );

  if (disallow) {
    context.report({
      message: disallow.error,
      loc: node.loc,
    });
    return;
  }

  const rename = first(
    mappings,
    'rename',
    ({ from }) => from === node.value || node.value.startsWith(`${from}/`)
  );

  if (!rename) {
    return;
  }

  const newRequest = node.value.replace(rename.from, rename.to);
  context.report({
    message: `Imported module "${node.value}" should be "${newRequest}"`,
    loc: node.loc,
    fix(fixer) {
      return fixer.replaceText(node, `'${newRequest}'`);
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
          anyOf: [
            // rename configs
            {
              type: 'object',
              properties: {
                rename: {
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
                },
              },
              additionalProperties: false,
            },

            // disallow configs
            {
              type: 'object',
              properties: {
                disallow: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                    },
                    error: {
                      type: 'string',
                    },
                  },
                  required: ['name', 'error'],
                },
              },
              additionalProperties: false,
            },

            // relativeToNamed configs
            {
              type: 'object',
              properties: {
                relativeToNamed: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                    },
                    directory: {
                      type: 'string',
                    },
                  },
                  required: ['name', 'directory'],
                },
              },
              additionalProperties: false,
            },
          ],
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
      ExportNamedDeclaration(node) {
        if (node.source) {
          checkModuleNameNode(context, mappings, node.source);
        }
      },
      ExportAllDeclaration(node) {
        checkModuleNameNode(context, mappings, node.source);
      },
      ExportDefaultSpecifier(node) {
        checkModuleNameNode(context, mappings, node.source);
      },
      ExportNamespaceSpecifier(node) {
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
