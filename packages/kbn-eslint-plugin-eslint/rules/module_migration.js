/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const path = require('path');
const findKibanaRoot = require('../helpers/find_kibana_root');
const KIBANA_ROOT = findKibanaRoot();

function checkModuleNameNode(context, mappings, node, desc = 'Imported') {
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
    message: `${desc} module "${node.value}" should be "${newSource}"`,
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
            include: {
              type: 'array',
            },
            exclude: {
              type: 'array',
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
    const filename = path.relative(KIBANA_ROOT, context.getFilename());

    const mappings = context.options[0].filter((mapping) => {
      // exclude mapping rule if it is explicitly excluded from this file
      if (mapping.exclude && mapping.exclude.some((p) => p.test(filename))) {
        return false;
      }

      // if this mapping rule is only included in specific files, optionally include it
      if (mapping.include) {
        return mapping.include.some((p) => p.test(filename));
      }

      // include all mapping rules by default
      return true;
    });

    return {
      ImportDeclaration(node) {
        checkModuleNameNode(context, mappings, node.source);
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          checkModuleNameNode(context, mappings, node.source, 'Re-exported');
        }
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
