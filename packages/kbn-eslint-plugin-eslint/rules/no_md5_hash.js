/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Discourage usage of createHash with "md5"',
      category: 'FIPS',
      recommended: false,
    },
    messages: {
      noMd5Hash: 'Usage of createHash with "md5" is not allowed.',
    },
    schema: [],
  },
  create(context) {
    let isCreateHashImported = false;
    let createHashName = 'createHash';
    const md5Variables = new Set();
    const sourceCode = context.getSourceCode();

    function checkIdentifierValue(node) {
      const scope = sourceCode.scopeManager.acquire(node);

      if (scope) {
        const variable = scope.variables.find((variable) => variable.name === node.name);

        if (variable && variable.defs.length > 0) {
          const def = variable.defs[0];
          if (def.node.init && def.node.init.type === 'Literal' && def.node.init.value === 'md5') {
            md5Variables.add(node.name);
          }
        }
      }
    }

    return {
      ImportDeclaration(node) {
        if (node.source.value === 'crypto') {
          node.specifiers.forEach((specifier) => {
            if (specifier.type === 'ImportSpecifier' && specifier.imported.name === 'createHash') {
              isCreateHashImported = true;
              createHashName = specifier.local.name;
            }
          });
        }
      },
      VariableDeclarator(node) {
        if (node.init && node.init.type === 'Literal' && node.init.value === 'md5') {
          md5Variables.add(node.id.name);
        }
      },
      AssignmentExpression(node) {
        if (
          node.right.type === 'Literal' &&
          node.right.value === 'md5' &&
          node.left.type === 'Identifier'
        ) {
          md5Variables.add(node.left.name);
        }
      },
      CallExpression(node) {
        if (
          (node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'crypto' &&
            node.callee.property.name === 'createHash') ||
          (isCreateHashImported && node.callee.name === createHashName)
        ) {
          if (node.arguments.length > 0) {
            const arg = node.arguments[0];

            if (arg.type === 'Literal' && arg.value === 'md5') {
              context.report({
                node,
                messageId: 'noMd5Hash',
              });
            } else if (arg.type === 'Identifier') {
              checkIdentifierValue(arg);
              if (md5Variables.has(arg.name)) {
                context.report({
                  node,
                  messageId: 'noMd5Hash',
                });
              }
            }
          }
        }
      },
    };
  },
};
