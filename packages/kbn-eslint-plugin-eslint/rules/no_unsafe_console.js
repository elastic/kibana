/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const tsEstree = require('@typescript-eslint/typescript-estree');
const esTypes = tsEstree.AST_NODE_TYPES;

/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Node} Node */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.CallExpression} CallExpression */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.CallExpression} VariableDeclarator */

const ERROR_MSG = 'Unexpected unsafeConsole statement.';

/**
 * @param {CallExpression} node
 */
const isUnsafeConsoleCall = (node) => {
  return (
    node.callee.type === esTypes.MemberExpression &&
    node.callee.property.type === esTypes.Identifier &&
    node.callee.object.name === 'unsafeConsole' &&
    node.callee.property.name
  );
};

/**
 * @param {VariableDeclarator} node
 */
const isUnsafeConsoleObjectPatternDeclarator = (node) => {
  return (
    node.id.type === esTypes.ObjectPattern &&
    node.init &&
    node.init.type === esTypes.Identifier &&
    node.init.name === 'unsafeConsole'
  );
};

/** @type {Rule} */
module.exports = {
  meta: {
    fixable: 'code',
    schema: [],
  },
  create: (context) => ({
    CallExpression(_) {
      const node = /** @type {CallExpression} */ (_);

      if (isUnsafeConsoleCall(node)) {
        context.report({
          message: ERROR_MSG,
          loc: node.callee.loc,
        });
      }
    },
    VariableDeclarator(_) {
      const node = /** @type {VariableDeclarator} */ (_);

      if (isUnsafeConsoleObjectPatternDeclarator(node)) {
        context.report({
          message: ERROR_MSG,
          loc: node.init.loc,
        });
      }
    },
  }),
};
