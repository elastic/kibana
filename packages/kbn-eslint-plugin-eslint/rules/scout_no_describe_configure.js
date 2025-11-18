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

const ERROR_MSG = 'Using describe.configure is not allowed in Scout tests.';

/**
 * Checks if a node represents *.describe.configure()
 * @param {CallExpression} node
 * @returns {boolean}
 */
const isDescribeConfigure = (node) => {
  // Check for *.describe.configure()
  return (
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'configure' &&
    node.callee.object.type === 'MemberExpression' &&
    node.callee.object.property.type === 'Identifier' &&
    node.callee.object.property.name === 'describe'
  );
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow describe.configure in Scout tests',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [],
  },
  create: (context) => ({
    CallExpression(node) {
      if (isDescribeConfigure(node)) {
        context.report({
          node,
          message: ERROR_MSG,
        });
      }
    },
  }),
};
