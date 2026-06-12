/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */

// Playwright wait method names that signal the bad `Promise.all([wait, wait, ...])`
// pattern when used as entries in `Promise.all`. Listener-style waits used in the
// documented `Promise.all([listener, action])` pattern (`waitForEvent`,
// `waitForURL`, `waitForResponse`, `waitForRequest`, `waitForNavigation`) are
// intentionally NOT included here so the listener-then-trigger pattern still works.
const DISALLOWED_METHODS = new Set(['waitFor', 'waitForSelector', 'waitForLoadState']);

function getCalledName(node) {
  if (!node || node.type !== 'CallExpression') return undefined;
  const callee = node.callee;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return callee.property.name;
  }
  return undefined;
}

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow Promise.all over Playwright wait APIs in Scout tests; await sequentially instead.',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [],
    messages: {
      noPromiseAll:
        "Don't use `Promise.all` with Playwright wait APIs. Parallel waits share one timeout window and amplify backend contention, producing flaky timeouts. Await sequentially or iterate with a `for` loop.",
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        // Match `Promise.all(...)`.
        const callee = node.callee;
        if (
          callee.type !== 'MemberExpression' ||
          callee.object.type !== 'Identifier' ||
          callee.object.name !== 'Promise' ||
          callee.property.type !== 'Identifier' ||
          callee.property.name !== 'all'
        ) {
          return;
        }

        const arg = node.arguments[0];
        if (!arg || arg.type !== 'ArrayExpression') return;

        const hasDisallowed = arg.elements.some((el) => {
          const name = getCalledName(el);
          return name !== undefined && DISALLOWED_METHODS.has(name);
        });
        if (hasDisallowed) {
          context.report({ node, messageId: 'noPromiseAll' });
        }
      },
    };
  },
};
