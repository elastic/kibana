/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.CallExpression} CallExpression */

const ERROR_MSG =
  'Only one root-level describe block is allowed per file. This is required for auto-skip functionality in CI.';

/**
 * Checks if a node represents a method describe() call (e.g., test.describe, apiTest.describe)
 * @param {CallExpression} node
 * @returns {boolean} True if this is a method describe call
 */
const isDescribeCall = (node) => {
  // Check for *.describe() pattern
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'describe'
  ) {
    return true;
  }

  return false;
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure at most one root-level describe block in Scout tests',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [],
  },
  create: (context) => {
    let rootDescribeCount = 0;
    let depth = 0;

    return {
      CallExpression(node) {
        if (isDescribeCall(node)) {
          // Only count root-level describe calls (depth === 0)
          if (depth === 0) {
            rootDescribeCount++;
            // Report error if this is the second or subsequent occurrence
            if (rootDescribeCount > 1) {
              context.report({
                node,
                message: ERROR_MSG,
              });
            }
          }
          depth++;
        }
      },
      'CallExpression:exit'(node) {
        if (isDescribeCall(node)) {
          depth--;
        }
      },
    };
  },
};
