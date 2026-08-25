/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */

const path = require('path');

const ERROR_MSG =
  '`esArchiver` should not be used in parallel tests. Use `globalSetupHook` in `global.setup.ts` to load archives before tests run.';

const TEST_FIXTURES = new Set(['test', 'apiTest']);

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid esArchiver usage in parallel tests',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [],
  },
  create: (context) => {
    const filename = context.getFilename();

    // Only apply to files in parallel_tests directories, excluding global.setup.ts
    if (!filename.includes('/parallel_tests/') || path.basename(filename) === 'global.setup.ts') {
      return {};
    }

    return {
      CallExpression(node) {
        const { callee } = node;

        // Check for test(...) or test.method(...)
        const isFixture =
          (callee.type === 'Identifier' && TEST_FIXTURES.has(callee.name)) ||
          (callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            TEST_FIXTURES.has(callee.object.name));

        if (!isFixture) return;

        // Get the callback (last argument)
        const callback = node.arguments[node.arguments.length - 1];
        if (!callback || !['ArrowFunctionExpression', 'FunctionExpression'].includes(callback.type))
          return;

        // Check for { esArchiver } in first param
        const param = callback.params[0];
        if (param?.type !== 'ObjectPattern') return;

        const hasEsArchiver = param.properties.some(
          (p) => p.type === 'Property' && p.key.type === 'Identifier' && p.key.name === 'esArchiver'
        );

        if (hasEsArchiver) {
          context.report({ node: param, message: ERROR_MSG });
        }
      },
    };
  },
};
