/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */

const MESSAGE =
  "Do not statically import or re-export values from './plugin' in the server plugin entry. Use `import type` for types only, move shared config to `config.ts` when needed, and load the implementation with `await import('./plugin')` so disabled plugins do not load this module. See https://github.com/elastic/kibana/pull/170856.";

/**
 * @param {string | undefined} source
 * @returns {boolean}
 */
function isPluginModuleSpecifier(source) {
  return source === './plugin' || source === '.\\plugin';
}

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow static value imports and value re-exports from `./plugin` in plugin server entry files.',
    },
    schema: [],
    messages: {
      noSyncImportFromPlugin: MESSAGE,
    },
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        if (!node.source || !isPluginModuleSpecifier(node.source.value)) {
          return;
        }

        if (node.importKind === 'type') {
          return;
        }

        if (node.specifiers.length === 0) {
          context.report({ node, messageId: 'noSyncImportFromPlugin' });
          return;
        }

        for (const spec of node.specifiers) {
          if (spec.type === 'ImportSpecifier' && spec.importKind === 'type') {
            continue;
          }
          context.report({ node: spec, messageId: 'noSyncImportFromPlugin' });
          return;
        }
      },

      ExportNamedDeclaration(node) {
        if (!node.source || !isPluginModuleSpecifier(node.source.value)) {
          return;
        }

        if (node.exportKind === 'type') {
          return;
        }

        for (const spec of node.specifiers) {
          if (spec.type === 'ExportSpecifier' && spec.exportKind === 'type') {
            continue;
          }
          context.report({ node: spec, messageId: 'noSyncImportFromPlugin' });
          return;
        }
      },

      ExportAllDeclaration(node) {
        if (!node.source || !isPluginModuleSpecifier(node.source.value)) {
          return;
        }

        if (node.exportKind === 'type') {
          return;
        }

        context.report({ node, messageId: 'noSyncImportFromPlugin' });
      },

      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments[0]?.type === 'Literal' &&
          typeof node.arguments[0].value === 'string' &&
          isPluginModuleSpecifier(node.arguments[0].value)
        ) {
          context.report({ node, messageId: 'noSyncImportFromPlugin' });
        }
      },
    };
  },
};
