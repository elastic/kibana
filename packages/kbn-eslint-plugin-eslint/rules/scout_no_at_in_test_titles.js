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

const SCOUT_CALLERS = ['test', 'apiTest', 'spaceTest'];
const AT_WORD_REGEX = /@\w+/;

const ERROR_MSG =
  'Test titles must not contain `@word` patterns (e.g. `@timestamp`). Playwright treats `@word` as a tag, which causes Scout tag validation to fail. Rephrase the title (e.g. use `timestamp field` instead of `@timestamp`).';

/**
 * Checks if a node represents a method describe() call (e.g., test.describe, apiTest.describe)
 * @param {CallExpression} node
 * @returns {boolean}
 */
const isDescribeCall = (node) => {
  return (
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    SCOUT_CALLERS.includes(node.callee.object.name) &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'describe'
  );
};

/**
 * Checks if a node is a direct Scout test call (e.g., test(), apiTest(), spaceTest())
 * @param {CallExpression} node
 * @returns {boolean}
 */
const isTestCall = (node) => {
  return node.callee.type === 'Identifier' && SCOUT_CALLERS.includes(node.callee.name);
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow `@word` patterns in Scout test/describe titles. Playwright treats these as tags, causing Scout tag validation failures.',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [],
    messages: {
      atInTitle: ERROR_MSG,
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        if (!isDescribeCall(node) && !isTestCall(node)) {
          return;
        }

        const titleArg = node.arguments[0];
        if (!titleArg) {
          return;
        }

        if (titleArg.type === 'Literal' && typeof titleArg.value === 'string') {
          if (AT_WORD_REGEX.test(titleArg.value)) {
            context.report({ node: titleArg, messageId: 'atInTitle' });
          }
        }

        if (titleArg.type === 'TemplateLiteral') {
          for (const quasi of titleArg.quasis) {
            if (AT_WORD_REGEX.test(quasi.value.raw)) {
              context.report({ node: titleArg, messageId: 'atInTitle' });
              return;
            }
          }
        }
      },
    };
  },
};
