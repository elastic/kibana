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

const ERROR_MSG_MISSING_HOOK =
  '`global.setup.ts` must explicitly call `globalSetupHook`. Without it, ES security indexes are not pre-generated and tests become flaky.';

/**
 * Checks if a file is a global.setup.ts file
 * @param {string} filename
 * @returns {boolean}
 */
const isGlobalSetupFile = (filename) => {
  return path.basename(filename) === 'global.setup.ts';
};

/**
 * Checks if a node is a call to globalSetupHook
 * @param {CallExpression} node
 * @returns {boolean}
 */
const isGlobalSetupHookCall = (node) => {
  return node.callee.type === 'Identifier' && node.callee.name === 'globalSetupHook';
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require globalSetupHook call in global.setup.ts files',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [],
  },
  create: (context) => {
    const filename = context.getFilename();

    if (!isGlobalSetupFile(filename)) {
      return {};
    }

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
  },
};
