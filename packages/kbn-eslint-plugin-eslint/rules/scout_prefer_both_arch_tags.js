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
// Returns null when any step is computed (e.g. tags[architecture]) — caller treats null as unresolvable.
const getMemberChain = (node) => {
  const chain = [];
  let current = node;
  while (current.type === 'MemberExpression') {
    if (current.computed || current.property.type !== 'Identifier') return null;
    chain.unshift(current.property.name);
    current = current.object;
  }
  if (current.type === 'Identifier') chain.unshift(current.name);
  return chain;
};

// Returns { hasStateful, hasServerless, hasUnknown }.
// hasUnknown: true means an unresolvable node (variable, computed expression) was found;
// it may provide the missing architecture, so the one-arch warning is suppressed.
// Known-neutral nodes (tags.performance, null elements) set hasUnknown: false so they
// do not suppress the warning — e.g. [...tags.stateful.classic, ...tags.performance]
// still warns as stateful-only.
// tags.deploymentAgnostic → both true → no warning (covers all archs).
const getArchInfo = (node) => {
  if (!node) return { hasStateful: false, hasServerless: false, hasUnknown: false };

  if (node.type === 'ArrayExpression') {
    const results = node.elements.map((el) =>
      el && el.type === 'SpreadElement' ? getArchInfo(el.argument) : getArchInfo(el)
    );
    return {
      hasStateful: results.some((r) => r.hasStateful),
      hasServerless: results.some((r) => r.hasServerless),
      hasUnknown: results.some((r) => r.hasUnknown),
    };
  }

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return {
      hasStateful: node.value.includes('-stateful-'),
      hasServerless: node.value.includes('-serverless-'),
      hasUnknown: false,
    };
  }

  if (node.type === 'MemberExpression') {
    const chain = getMemberChain(node);
    if (!chain) return { hasStateful: false, hasServerless: false, hasUnknown: true };
    if (chain[0] === 'tags') {
      // Known tags.* shapes — none are unknown
      if (chain[1] === 'deploymentAgnostic')
        return { hasStateful: true, hasServerless: true, hasUnknown: false };
      if (chain[1] === 'stateful')
        return { hasStateful: true, hasServerless: false, hasUnknown: false };
      if (chain[1] === 'serverless')
        return { hasStateful: false, hasServerless: true, hasUnknown: false };
      // tags.performance and future keys → known neutral
      return { hasStateful: false, hasServerless: false, hasUnknown: false };
    }
    // Non-tags MemberExpression (e.g. sharedTags.foo) → unresolvable
    return { hasStateful: false, hasServerless: false, hasUnknown: true };
  }

  // Identifier, CallExpression, etc. → unresolvable
  return { hasStateful: false, hasServerless: false, hasUnknown: true };
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

        const tagPropIndex = optionsArg.properties.findIndex(
          (p) => p.type === 'Property' && p.key.type === 'Identifier' && p.key.name === 'tag'
        );
        if (tagPropIndex === -1) return;

        // A spread after the tag property can override it — suppress conservatively
        const hasSpreadAfterTag = optionsArg.properties
          .slice(tagPropIndex + 1)
          .some((p) => p.type === 'SpreadElement');
        if (hasSpreadAfterTag) return;

        const tagProp = optionsArg.properties[tagPropIndex];

        const { hasStateful, hasServerless, hasUnknown } = getArchInfo(tagProp.value);

        if (hasUnknown) return;

        if (hasStateful && !hasServerless) {
          context.report({ node: tagProp, messageId: 'statefulOnly' });
        } else if (hasServerless && !hasStateful) {
          context.report({ node: tagProp, messageId: 'serverlessOnly' });
        }
      },
    };
  },
};
