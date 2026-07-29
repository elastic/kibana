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
  '`apiServices.core.settings(...)` sets dynamic config overrides (e.g. `feature_flags.overrides`) that are server-wide, not scoped to a single space. `spaceTest` runs suites in parallel across spaces sharing the same server, so calling it here can leak into other spaces/workers running concurrently. Use `globalSetupHook`/`globalTeardownHook` in `global.setup.ts`/`global.teardown.ts` instead.';

/**
 * Checks if a node's callee is `spaceTest` or a member access on it
 * (e.g. `spaceTest(...)`, `spaceTest.describe(...)`, `spaceTest.beforeAll(...)`, `spaceTest.step(...)`).
 * @param {CallExpression} node
 * @returns {boolean}
 */
const isSpaceTestCall = (node) => {
  const { callee } = node;

  if (callee.type === 'Identifier') {
    return callee.name === 'spaceTest';
  }

  if (callee.type === 'MemberExpression') {
    return callee.object.type === 'Identifier' && callee.object.name === 'spaceTest';
  }

  return false;
};

/**
 * Checks if a node represents an `apiServices.core.settings(...)` call.
 * @param {CallExpression} node
 * @returns {boolean}
 */
const isCoreSettingsCall = (node) => {
  const { callee } = node;

  if (callee.type !== 'MemberExpression' || callee.property.type !== 'Identifier') {
    return false;
  }
  if (callee.property.name !== 'settings') {
    return false;
  }

  const coreObject = callee.object;
  if (coreObject.type !== 'MemberExpression' || coreObject.property.type !== 'Identifier') {
    return false;
  }
  if (coreObject.property.name !== 'core') {
    return false;
  }

  const apiServicesObject = coreObject.object;
  return apiServicesObject.type === 'Identifier' && apiServicesObject.name === 'apiServices';
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Warn against `apiServices.core.settings(...)` calls inside `spaceTest` scope, since dynamic config overrides are server-wide and leak across parallel spaces/workers.',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [],
    messages: {
      noCoreSettingsInSpaceTest: ERROR_MSG,
    },
  },

  create(context) {
    let spaceTestDepth = 0;

    return {
      CallExpression(node) {
        if (isSpaceTestCall(node)) {
          spaceTestDepth++;
        }

        if (spaceTestDepth > 0 && isCoreSettingsCall(node)) {
          context.report({ node, messageId: 'noCoreSettingsInSpaceTest' });
        }
      },
      'CallExpression:exit'(node) {
        if (isSpaceTestCall(node)) {
          spaceTestDepth--;
        }
      },
    };
  },
};
