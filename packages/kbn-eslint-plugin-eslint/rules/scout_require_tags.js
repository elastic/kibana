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

const SCOUT_CALLERS = new Set(['test', 'apiTest', 'spaceTest']);
const MISSING_MSG =
  'Root-level Scout describe blocks must declare `tag`, e.g. ' +
  '`{ tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] }` ' +
  '(or tag the tests inside it individually). ' +
  'Untagged suites are not selected by target (architecture/domain) runs.';

const EMPTY_MSG = 'The `tag` option of this Scout describe block is empty.';

const DESCRIBE_MODIFIERS = new Set(['skip', 'only', 'fixme', 'serial', 'parallel']);
const TEST_MODIFIERS = new Set(['skip', 'only', 'fixme', 'fail']);

const isFunctionLike = (node) =>
  node?.type === 'ArrowFunctionExpression' ||
  node?.type === 'FunctionExpression' ||
  node?.type === 'Identifier';

/**
 * Matches `test|apiTest|spaceTest.describe(...)` and its supported modifiers.
 * @param {CallExpression} node
 */
const isDescribeCall = (node, scoutCallers) => {
  const { callee } = node;
  if (callee.type !== 'MemberExpression' || callee.property.type !== 'Identifier') return false;
  if (
    callee.property.name === 'describe' &&
    callee.object.type === 'Identifier' &&
    scoutCallers.has(callee.object.name)
  ) {
    return true;
  }
  return (
    DESCRIBE_MODIFIERS.has(callee.property.name) &&
    callee.object.type === 'MemberExpression' &&
    callee.object.property.type === 'Identifier' &&
    callee.object.property.name === 'describe' &&
    callee.object.object.type === 'Identifier' &&
    scoutCallers.has(callee.object.object.name)
  );
};

/**
 * Matches direct Scout test declarations, including test modifiers.
 * @param {CallExpression} node
 */
const isTestCall = (node, scoutCallers) => {
  const { callee } = node;
  if (callee.type === 'Identifier') {
    return scoutCallers.has(callee.name);
  }
  return (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    scoutCallers.has(callee.object.name) &&
    callee.property.type === 'Identifier' &&
    TEST_MODIFIERS.has(callee.property.name) &&
    node.arguments.length >= 2 &&
    isFunctionLike(node.arguments[node.arguments.length - 1])
  );
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require a `tag` option on root-level Scout describe blocks',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [],
    messages: {
      missingTag: MISSING_MSG,
      emptyTag: EMPTY_MSG,
    },
  },
  createOnce(context) {
    let suiteStack;
    let pending;
    let testCallDepth;
    const testDeclarationNodes = new WeakSet();
    const scoutCallers = new Set(SCOUT_CALLERS);

    const getTagState = (callNode) => {
      const optionsArg = callNode.arguments[1];
      if (
        !optionsArg ||
        optionsArg.type === 'ArrowFunctionExpression' ||
        optionsArg.type === 'FunctionExpression' ||
        (optionsArg.type === 'Identifier' &&
          callNode.arguments.length === 2 &&
          callNode.arguments[callNode.arguments.length - 1] === optionsArg)
      ) {
        return 'missing';
      }
      if (optionsArg.type !== 'ObjectExpression') return 'unknown';

      if (optionsArg.properties.some((property) => property.type === 'SpreadElement')) {
        return 'unknown';
      }

      const tagProperty = optionsArg.properties.find(
        (property) =>
          property.type === 'Property' &&
          ((property.key.type === 'Identifier' && property.key.name === 'tag') ||
            (property.key.type === 'Literal' && property.key.value === 'tag'))
      );
      if (!tagProperty) return 'missing';
      if (tagProperty.value.type === 'ArrayExpression' && tagProperty.value.elements.length === 0) {
        return 'empty';
      }
      return 'tagged';
    };

    return {
      before() {
        suiteStack = [];
        pending = null;
        testCallDepth = 0;
      },
      Program(node) {
        for (const statement of node.body) {
          if (statement.type !== 'ImportDeclaration') continue;

          for (const specifier of statement.specifiers) {
            if (
              specifier.type !== 'ImportSpecifier' &&
              specifier.type !== 'ImportDefaultSpecifier'
            ) {
              continue;
            }

            const importedName =
              specifier.type === 'ImportSpecifier' && specifier.imported.type === 'Identifier'
                ? specifier.imported.name
                : specifier.local.name;
            const localName = specifier.local.name;

            if (
              SCOUT_CALLERS.has(importedName) ||
              SCOUT_CALLERS.has(localName) ||
              /(?:Api|Ui)?Test$/.test(localName)
            ) {
              scoutCallers.add(localName);
            }
          }
        }
      },
      CallExpression(node) {
        if (testCallDepth > 0) return;

        if (isTestCall(node, scoutCallers)) {
          if (!pending) return;

          testDeclarationNodes.add(node);
          testCallDepth++;
          pending.testCount++;
          const testTagState = getTagState(node);
          const suiteHasTag = suiteStack.some((suite) => suite.hasTag);
          if (!suiteHasTag && testTagState !== 'tagged' && testTagState !== 'unknown') {
            pending.hasUntaggedTest = true;
          }
          return;
        }

        if (!isDescribeCall(node, scoutCallers)) return;

        const isRoot = suiteStack.length === 0;
        const tagState = getTagState(node);
        suiteStack.push({ hasTag: tagState === 'tagged' || tagState === 'unknown' });

        if (!isRoot) return;
        if (tagState === 'missing') {
          pending = { node, testCount: 0, hasUntaggedTest: false };
          return;
        }
        if (tagState === 'empty') {
          context.report({ node: node.arguments[1], messageId: 'emptyTag' });
        }
      },
      'CallExpression:exit'(node) {
        if (testDeclarationNodes.has(node)) {
          testCallDepth--;
        }

        if (!isDescribeCall(node, scoutCallers)) return;
        suiteStack.pop();
        if (suiteStack.length === 0 && pending?.node === node) {
          if (pending.testCount === 0 || pending.hasUntaggedTest) {
            context.report({ node, messageId: 'missingTag' });
          }
          pending = null;
        }
      },
    };
  },
};
