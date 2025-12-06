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
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.MemberExpression} MemberExpression */

const ERROR_MSG = 'Only one describe block is allowed per test type (apiTest, test, or spaceTest).';

const TEST_FIXTURES = new Set(['apiTest', 'test', 'spaceTest']);

/**
 * Checks if a node represents apiTest.describe(), test.describe(), or spaceTest.describe()
 * @param {CallExpression} node
 * @returns {string | null} The test type ('apiTest', 'test', 'spaceTest') or null if not a match
 */
const getDescribeTestType = (node) => {
  // Check for *.describe() pattern
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'describe' &&
    node.callee.object.type === 'Identifier'
  ) {
    const objectName = node.callee.object.name;
    if (TEST_FIXTURES.has(objectName)) {
      return objectName;
    }
  }
  return null;
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ensure at most one describe block per test type (apiTest, test, or spaceTest) in Scout tests',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [],
  },
  create: (context) => {
    // Track count of each test type's describe calls
    const describeCounts = {
      apiTest: 0,
      test: 0,
      spaceTest: 0,
    };

    return {
      CallExpression(node) {
        const testType = getDescribeTestType(node);
        if (testType) {
          describeCounts[testType]++;
          // Report error if this is the second or subsequent occurrence
          if (describeCounts[testType] > 1) {
            context.report({
              node,
              message: ERROR_MSG,
            });
          }
        }
      },
    };
  },
};
