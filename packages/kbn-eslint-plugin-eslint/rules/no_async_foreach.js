/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const tsEstree = require('@typescript-eslint/typescript-estree');
const esTypes = tsEstree.AST_NODE_TYPES;

/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Node} Node */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.CallExpression} CallExpression */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.FunctionExpression} FunctionExpression */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.ArrowFunctionExpression} ArrowFunctionExpression */
/** @typedef {import("eslint").Rule.RuleFixer} Fixer */

const ERROR_MSG =
  'Passing an async function to .forEach() prevents promise rejections from being handled. Use asyncForEach() or similar helper from "@kbn/std" instead.';

/**
 * @param {Node} node
 * @returns {node is ArrowFunctionExpression | FunctionExpression}
 */
const isFunc = (node) =>
  node.type === esTypes.ArrowFunctionExpression || node.type === esTypes.FunctionExpression;

/**
 * @param {any} context
 * @param {CallExpression} node
 */
const isAsyncForEachCall = (node) => {
  return (
    node.callee.type === esTypes.MemberExpression &&
    node.callee.property.type === esTypes.Identifier &&
    node.callee.property.name === 'forEach' &&
    node.arguments.length >= 1 &&
    isFunc(node.arguments[0]) &&
    node.arguments[0].async
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

      if (isAsyncForEachCall(node)) {
        context.report({
          message: ERROR_MSG,
          loc: node.arguments[0].loc,
        });
      }
    },
  }),
};
