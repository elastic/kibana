/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Bans the string `npx playwright` from appearing in string literals and template literals
 * inside shell-execution call expressions (exec, execSync, spawn, spawnSync, execa, execaSync).
 *
 * Use `node scripts/playwright` instead, which is a thin, safe wrapper that goes through
 * Kibana's setup and uses the pinned @playwright/test version without auto-installing anything.
 */

const SHELL_EXEC_FUNCTIONS = new Set([
  'exec',
  'execSync',
  'spawn',
  'spawnSync',
  'execa',
  'execaSync',
  'execaCommand',
  'execaCommandSync',
]);

const ERROR_MSG =
  "Do not use 'npx playwright' — use 'node scripts/playwright' instead. " +
  'npx may auto-install a different Playwright version, bypassing the pinned @playwright/test dependency.';

/**
 * Returns true if the given string value contains 'npx playwright'.
 * @param {string} value
 */
function containsNpxPlaywright(value) {
  return typeof value === 'string' && value.includes('npx playwright');
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: "Disallow 'npx playwright' in shell execution calls",
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noNpxPlaywright: ERROR_MSG,
    },
  },

  create(context) {
    /**
     * Report if a node is a string literal or template literal containing 'npx playwright'.
     */
    function checkStringNode(node) {
      if (node.type === 'Literal' && containsNpxPlaywright(node.value)) {
        context.report({ node, messageId: 'noNpxPlaywright' });
      } else if (node.type === 'TemplateLiteral') {
        for (const quasi of node.quasis) {
          if (containsNpxPlaywright(quasi.value.raw)) {
            context.report({ node, messageId: 'noNpxPlaywright' });
            break;
          }
        }
      }
    }

    /**
     * Resolve the function name from a callee node, handling both direct calls
     * (exec(...)) and member-expression calls (child_process.exec(...)).
     */
    function getCalleeName(callee) {
      if (callee.type === 'Identifier') {
        return callee.name;
      }
      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        return callee.property.name;
      }
      return null;
    }

    return {
      CallExpression(node) {
        const calleeName = getCalleeName(node.callee);
        if (!calleeName || !SHELL_EXEC_FUNCTIONS.has(calleeName)) {
          return;
        }
        for (const arg of node.arguments) {
          checkStringNode(arg);
        }
      },
    };
  },
};
