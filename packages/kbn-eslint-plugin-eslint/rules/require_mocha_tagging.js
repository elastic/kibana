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
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.FunctionExpression} FunctionExpression */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.ArrowFunctionExpression} ArrowFunctionExpression */
/** @typedef {import("eslint").Rule.RuleFixer} Fixer */

const ERROR_MSG = `Describe blocks must be tagged with either @ess or @serverless to specify the test execution environment. Ex: describe('@ess @serverless API Integration test', () => {})`;

/**
 * @param {any} context
 * @param {CallExpression} node
 */
const isDescribeBlockWithoutTagging = (node) => {
  const isDescribeBlock =
    node.type === esTypes.CallExpression &&
    node.callee.type === esTypes.Identifier &&
    node.callee.name === 'describe' &&
    node.arguments.length >= 1;

  if (!isDescribeBlock) {
    return false;
  }
  const title = node.arguments[0].value;
  const hasTags = /^(@ess|@serverless)/.test(title);
  if (hasTags) {
    return false;
  } else {
    return true;
  }
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

      if (isDescribeBlockWithoutTagging(node)) {
        context.report({
          message: ERROR_MSG,
          loc: node.arguments[0].loc,
        });
      }
    },
  }),
};
