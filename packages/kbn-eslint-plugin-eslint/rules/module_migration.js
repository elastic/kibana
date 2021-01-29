/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const path = require('path');
const KIBANA_ROOT = path.resolve(__dirname, '../../..');

function checkModuleNameNode(context, mappings, node) {
  const mapping = mappings.find(
    (mapping) => mapping.from === node.value || node.value.startsWith(`${mapping.from}/`)
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
    const sourceDirectory = path.dirname(context.getFilename());
    const localModulePath = node.value.replace(new RegExp(`^${mapping.from}\/`), '');
    const modulePath = path.resolve(KIBANA_ROOT, mapping.toRelative, localModulePath);
    const relativePath = path.relative(sourceDirectory, modulePath);

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
  create: (context) => {
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
