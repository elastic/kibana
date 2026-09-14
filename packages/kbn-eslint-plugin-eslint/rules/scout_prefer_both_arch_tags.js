/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */

// Walk a MemberExpression chain into an array of name parts.
// e.g. tags.stateful.classic → ['tags', 'stateful', 'classic']
const getMemberChain = (node) => {
  const chain = [];
  let current = node;
  while (current.type === 'MemberExpression') {
    if (current.property.type === 'Identifier') chain.unshift(current.property.name);
    current = current.object;
  }
  if (current.type === 'Identifier') chain.unshift(current.name);
  return chain;
};

// Returns { hasStateful, hasServerless }.
// Unknown/computed nodes → both false → no warning (conservative).
// tags.performance → both false → no warning (perf tests have no arch requirement).
// tags.deploymentAgnostic → both true → no warning (covers all archs).
const getArchInfo = (node) => {
  if (!node) return { hasStateful: false, hasServerless: false };

  if (node.type === 'ArrayExpression') {
    const results = node.elements.map((el) =>
      el && el.type === 'SpreadElement' ? getArchInfo(el.argument) : getArchInfo(el)
    );
    return {
      hasStateful: results.some((r) => r.hasStateful),
      hasServerless: results.some((r) => r.hasServerless),
    };
  }

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return {
      hasStateful: node.value.includes('-stateful-'),
      hasServerless: node.value.includes('-serverless-'),
    };
  }

  if (node.type === 'MemberExpression') {
    const chain = getMemberChain(node);
    if (chain[0] === 'tags') {
      if (chain[1] === 'deploymentAgnostic') return { hasStateful: true, hasServerless: true };
      if (chain[1] === 'stateful') return { hasStateful: true, hasServerless: false };
      if (chain[1] === 'serverless') return { hasStateful: false, hasServerless: true };
      // 'performance' and future keys → both false → no warning
    }
  }

  return { hasStateful: false, hasServerless: false };
};

const isDescribeCall = (node) =>
  node.callee.type === 'MemberExpression' &&
  node.callee.property.type === 'Identifier' &&
  node.callee.property.name === 'describe';

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn when a Scout test suite targets only one architecture (stateful or serverless). ' +
        'The recommended approach covers both. Use a single-architecture tag only when a feature ' +
        'is genuinely unavailable on the other platform.',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [],
    messages: {
      statefulOnly:
        'Test suite targets only the stateful architecture. ' +
        'Consider also adding serverless tags (e.g. `tags.serverless.<domain>`). ' +
        'Use a single-architecture tag only if the feature is genuinely unavailable on serverless.',
      serverlessOnly:
        'Test suite targets only the serverless architecture. ' +
        'Consider also adding stateful tags (e.g. `tags.stateful.classic`). ' +
        'Use a single-architecture tag only if the feature is genuinely unavailable on stateful.',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        if (!isDescribeCall(node) || node.arguments.length < 2) return;

        const optionsArg = node.arguments[1];
        if (optionsArg.type !== 'ObjectExpression') return;

        const tagProp = optionsArg.properties.find(
          (p) => p.type === 'Property' && p.key.type === 'Identifier' && p.key.name === 'tag'
        );
        if (!tagProp) return;

        const { hasStateful, hasServerless } = getArchInfo(tagProp.value);

        if (hasStateful && !hasServerless) {
          context.report({ node: tagProp, messageId: 'statefulOnly' });
        } else if (hasServerless && !hasStateful) {
          context.report({ node: tagProp, messageId: 'serverlessOnly' });
        }
      },
    };
  },
};
