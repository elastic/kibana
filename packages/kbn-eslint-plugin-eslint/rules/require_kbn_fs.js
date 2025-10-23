/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ERROR_MSG = 'Use `@kbn/fs` instead of direct `fs` imports';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce usage of @kbn/fs instead of direct fs imports',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
  },
  create: (context) => {
    return {
      ImportDeclaration(node) {
        if (node.source.value === 'fs') {
          context.report({
            node,
            message: ERROR_MSG,
            fix: (fixer) => {
              return fixer.replaceText(node.source, "'@kbn/fs'");
            },
          });
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal' &&
          node.arguments[0].value === 'fs'
        ) {
          context.report({
            node,
            message: ERROR_MSG,
            fix: (fixer) => {
              return fixer.replaceText(node.arguments[0], "'@kbn/fs'");
            },
          });
        }
      },
    };
  },
};
