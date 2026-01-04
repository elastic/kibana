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

const path = require('path');
const fs = require('fs');

const ERROR_MSG_MISSING_HOOK =
  '`global.setup.ts` must explicitly call `globalSetupHook`. Without it, ES security indexes are not pre-generated and tests become flaky.';

const ERROR_MSG_MISSING_FILE =
  'The `parallel_tests` directory must contain a `global.setup.ts` file and call `globalSetupHook`. Without it, ES security indexes are not pre-generated and tests become flaky.';

/**
 * Gets the parallel_tests directory from a filename, if the file is inside one
 * @param {string} filename
 * @returns {string|null}
 */
const getParallelTestsDir = (filename) => {
  const match = filename.match(/^(.+\/parallel_tests)\//);
  return match ? match[1] : null;
};

/**
 * Checks if a file is a global.setup.ts file inside a parallel_tests directory
 * @param {string} filename
 * @returns {boolean}
 */
const isGlobalSetupInParallelTests = (filename) => {
  const basename = path.basename(filename);
  return basename === 'global.setup.ts' && filename.includes('/parallel_tests/');
};

/**
 * Checks if a node is a call to globalSetupHook
 * @param {CallExpression} node
 * @returns {boolean}
 */
const isGlobalSetupHookCall = (node) => {
  return node.callee.type === 'Identifier' && node.callee.name === 'globalSetupHook';
};

// Track folders that have already been reported for missing global.setup.ts.
// Without this, the rule would fire for every file linted inside a parallel_tests directory with a missing `global.setups.ts` file.
const reportedMissingSetupDirs = new Set();

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require global.setup.ts with globalSetupHook in parallel_tests directories',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [],
  },
  create: (context) => {
    const filename = context.getFilename();
    const parallelTestsDir = getParallelTestsDir(filename);

    // Not inside a parallel_tests directory
    if (!parallelTestsDir) {
      return {};
    }

    // Check 1: If this is global.setup.ts, verify it calls globalSetupHook
    if (isGlobalSetupInParallelTests(filename)) {
      let hasGlobalSetupHook = false;

      return {
        CallExpression(node) {
          if (isGlobalSetupHookCall(node)) {
            hasGlobalSetupHook = true;
          }
        },
        'Program:exit'(node) {
          if (!hasGlobalSetupHook) {
            context.report({
              node,
              message: ERROR_MSG_MISSING_HOOK,
            });
          }
        },
      };
    }

    // Check 2: For any other file in parallel_tests, verify global.setup.ts exists
    return {
      'Program:exit'(node) {
        const globalSetupPath = path.join(parallelTestsDir, 'global.setup.ts');
        if (!fs.existsSync(globalSetupPath) && !reportedMissingSetupDirs.has(parallelTestsDir)) {
          reportedMissingSetupDirs.add(parallelTestsDir);
          context.report({
            node,
            message: ERROR_MSG_MISSING_FILE,
          });
        }
      },
    };
  },
};
