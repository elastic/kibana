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

const MISSING_MSG =
  'Root-level Scout describe blocks must declare `tag`, e.g. ' +
  '`{ tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] }` ' +
  '(or tag the tests inside it individually). ' +
  'Untagged suites are not selected by target (architecture/domain) runs.';

const EMPTY_MSG = 'The `tag` option of this Scout describe block is empty.';

const DESCRIBE_MODIFIERS = new Set(['skip', 'only', 'fixme', 'serial', 'parallel']);

/**
 * Matches `*.describe(...)` and `*.describe.skip|only|fixme|serial|parallel(...)`.
 * @param {CallExpression} node
 */
const isDescribeCall = (node) => {
  const { callee } = node;
  if (callee.type !== 'MemberExpression' || callee.property.type !== 'Identifier') return false;
  if (callee.property.name === 'describe') return true;
  return (
    DESCRIBE_MODIFIERS.has(callee.property.name) &&
    callee.object.type === 'MemberExpression' &&
    callee.object.property.type === 'Identifier' &&
    callee.object.property.name === 'describe'
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
    let depth;
    // Set while inside an untagged root describe: report only if none of its tests are tagged
    let pending;

    const hasTagOption = (callNode) =>
      callNode.arguments.some(
        (arg) =>
          arg.type === 'ObjectExpression' &&
          arg.properties.some(
            (p) => p.type === 'Property' && p.key.type === 'Identifier' && p.key.name === 'tag'
          )
      );

    return {
      before() {
        depth = 0;
        pending = null;
      },
      CallExpression(node) {
        if (!isDescribeCall(node)) {
          // Tests inside an untagged root describe may carry their own tags
          if (pending && hasTagOption(node)) pending.hasInnerTag = true;
          return;
        }
        const isRoot = depth === 0;
        depth++;
        // Nested describes inherit the tags of the root one
        if (!isRoot) {
          if (pending && hasTagOption(node)) pending.hasInnerTag = true;
          return;
        }

        // describe(title, fn) / describe(title, options, fn); anything else is not ours to judge
        const optionsArg = node.arguments[1];
        if (
          !optionsArg ||
          optionsArg.type === 'ArrowFunctionExpression' ||
          optionsArg.type === 'FunctionExpression'
        ) {
          pending = { node, hasInnerTag: false };
          return;
        }
        if (optionsArg.type !== 'ObjectExpression') return;

        // A spread may supply `tag`, so we can't tell
        if (optionsArg.properties.some((p) => p.type === 'SpreadElement')) return;

        const tagProp = optionsArg.properties.find(
          (p) => p.type === 'Property' && p.key.type === 'Identifier' && p.key.name === 'tag'
        );
        if (!tagProp) {
          pending = { node, hasInnerTag: false };
        } else if (
          tagProp.value.type === 'ArrayExpression' &&
          tagProp.value.elements.length === 0
        ) {
          context.report({ node: tagProp, messageId: 'emptyTag' });
        }
      },
      'CallExpression:exit'(node) {
        if (!isDescribeCall(node)) return;
        depth--;
        if (depth === 0 && pending) {
          if (pending.node === node && !pending.hasInnerTag) {
            context.report({ node, messageId: 'missingTag' });
          }
          if (pending.node === node) pending = null;
        }
      },
    };
  },
};
