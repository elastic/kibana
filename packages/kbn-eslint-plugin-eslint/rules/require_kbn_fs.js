/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const DEFAULT_ERROR_MSG = 'Use `@kbn/fs` instead of direct `fs` imports';
const DEFAULT_RESTRICTED_METHODS = ['writeFile', 'writeFileSync', 'createWriteStream'];

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce usage of @kbn/fs instead of direct fs imports',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          restrictedMethods: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of fs methods to restrict. If empty, all methods are restricted.',
          },
          disallowedMessage: {
            type: 'string',
            description: 'Custom error message',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create: (context) => {
    const {
      restrictedMethods = DEFAULT_RESTRICTED_METHODS,
      disallowedMessage = DEFAULT_ERROR_MSG,
    } = context.options[0] || {};
    const restrictAll = restrictedMethods.length === 0;

    // Track variables imported from fs modules (default/namespace imports)
    const fsImportedVars = new Set();

    const isRestrictedMethod = (methodName) => {
      return restrictAll || restrictedMethods.includes(methodName);
    };

    const checkImportSpecifiers = (node) => {
      if (!node.specifiers || node.specifiers.length === 0) {
        return false;
      }

      // Check named imports: import { writeFile } from 'fs'
      return node.specifiers.some((spec) => {
        if (spec.type === 'ImportSpecifier') {
          return isRestrictedMethod(spec.imported.name);
        }
        // ImportDefaultSpecifier or ImportNamespaceSpecifier - don't restrict
        // as they might only use read operations
        return false;
      });
    };

    const isFsModule = (modulePath) => {
      return (
        modulePath === 'fs' ||
        modulePath === 'fs/promises' ||
        modulePath === 'node:fs' ||
        modulePath === 'node:fs/promises'
      );
    };

    return {
      ImportDeclaration(node) {
        const modulePath = node.source.value;
        if (isFsModule(modulePath)) {
          // Track default and namespace imports for method call detection
          if (node.specifiers) {
            for (const spec of node.specifiers) {
              if (
                spec.type === 'ImportDefaultSpecifier' ||
                spec.type === 'ImportNamespaceSpecifier'
              ) {
                const varName = spec.local?.name;
                if (varName) {
                  fsImportedVars.add(varName);
                }
              }
            }
          }

          // Check named imports for immediate restriction
          if (checkImportSpecifiers(node)) {
            context.report({
              node,
              message: disallowedMessage,
              fix: (fixer) => {
                return fixer.replaceText(node.source, "'@kbn/fs'");
              },
            });
          }
        }
      },
      CallExpression(node) {
        const { callee } = node;

        if (callee.type === 'MemberExpression') {
          const objectName = callee.object.name;
          const propertyName = callee.property?.name;

          // Check method calls on fs directly: fs.writeFile()
          if (objectName === 'fs' && propertyName && isRestrictedMethod(propertyName)) {
            return context.report({
              node,
              message: disallowedMessage,
            });
          }

          // Check method calls on fs.promises: fs.promises.writeFile()
          if (
            callee.object.type === 'MemberExpression' &&
            callee.object.object?.name === 'fs' &&
            callee.object.property?.name === 'promises' &&
            propertyName &&
            isRestrictedMethod(propertyName)
          ) {
            return context.report({
              node,
              message: disallowedMessage,
            });
          }

          // Check method calls on imported fs variables: promises.writeFile()
          if (
            objectName &&
            fsImportedVars.has(objectName) &&
            propertyName &&
            isRestrictedMethod(propertyName)
          ) {
            return context.report({
              node,
              message: disallowedMessage,
            });
          }
        }
      },
    };
  },
};
