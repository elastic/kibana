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
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Expression} Expression */

const SCOUT_CALLERS = new Set(['test', 'apiTest', 'spaceTest']);
const TEST_MODIFIERS = new Set(['skip', 'only', 'fixme']);

const DEFAULT_UI_MAX_TESTS = 8;
const DEFAULT_API_MAX_TESTS = 15;

const API_SPEC_PATH = /\/api\/(?:parallel_)?tests\//;
const UI_SPEC_PATH = /\/ui\/(?:parallel_)?tests\//;

/**
 * @param {string} filename
 * @returns {'ui' | 'api'}
 */
const getSuiteKind = (filename) => {
  if (API_SPEC_PATH.test(filename)) {
    return 'api';
  }
  if (UI_SPEC_PATH.test(filename)) {
    return 'ui';
  }
  // Unknown layout: use the stricter UI cap.
  return 'ui';
};

/**
 * @param {Expression} callee
 * @returns {Expression}
 */
const unwrapEach = (callee) => {
  if (
    callee.type === 'CallExpression' &&
    callee.callee.type === 'MemberExpression' &&
    callee.callee.property.type === 'Identifier' &&
    callee.callee.property.name === 'each'
  ) {
    return callee.callee.object;
  }
  return callee;
};

/**
 * @param {Expression} node
 * @returns {boolean}
 */
const isScoutIdentifier = (node) => {
  return node.type === 'Identifier' && SCOUT_CALLERS.has(node.name);
};

/**
 * @param {CallExpression} node
 * @returns {boolean}
 */
const hasTestTitleAndFn = (node) => {
  if (node.arguments.length < 2) {
    return false;
  }

  const first = node.arguments[0];
  const last = node.arguments[node.arguments.length - 1];
  const hasTitle =
    (first.type === 'Literal' && typeof first.value === 'string') ||
    first.type === 'TemplateLiteral';
  const hasFn = last.type === 'FunctionExpression' || last.type === 'ArrowFunctionExpression';

  return hasTitle && hasFn;
};

/**
 * Leaf Scout tests: `test('title')`, `test.skip('title')`, `test.each(data)('title')`.
 * Does not count `describe`, hooks, `test.step`, or in-body `test.skip()`.
 * @param {CallExpression} node
 * @returns {boolean}
 */
const isLeafTestCall = (node) => {
  if (!hasTestTitleAndFn(node)) {
    return false;
  }

  const callee = unwrapEach(node.callee);

  if (isScoutIdentifier(callee)) {
    return true;
  }

  return (
    callee.type === 'MemberExpression' &&
    isScoutIdentifier(callee.object) &&
    callee.property.type === 'Identifier' &&
    TEST_MODIFIERS.has(callee.property.name)
  );
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Keep Scout spec files small so a skipped flake does not drop a large suite and so Playwright can parallelize at the file level.',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          uiMaxTests: { type: 'integer', minimum: 1 },
          apiMaxTests: { type: 'integer', minimum: 1 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooManyTests:
        'This Scout {{kind}} spec has {{count}} tests (max {{max}}). Split it by role and user flow so skipping a flake does not drop a large suite, and so the runner can parallelize at the file level.',
    },
  },

  create(context) {
    const filename = context.getFilename();
    const isSpecFile =
      filename.endsWith('.spec.ts') || filename.endsWith('.spec.tsx') || filename === '<input>';

    if (!isSpecFile) {
      return {};
    }

    const options = context.options[0] || {};
    const uiMaxTests = options.uiMaxTests ?? DEFAULT_UI_MAX_TESTS;
    const apiMaxTests = options.apiMaxTests ?? DEFAULT_API_MAX_TESTS;
    const kind = getSuiteKind(filename);
    const max = kind === 'api' ? apiMaxTests : uiMaxTests;

    /** @type {CallExpression[]} */
    const tests = [];

    return {
      CallExpression(node) {
        if (isLeafTestCall(node)) {
          tests.push(node);
        }
      },
      'Program:exit'() {
        if (tests.length <= max) {
          return;
        }

        context.report({
          node: tests[max],
          messageId: 'tooManyTests',
          data: {
            kind,
            count: String(tests.length),
            max: String(max),
          },
        });
      },
    };
  },
};
