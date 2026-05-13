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

const DEPRECATED_TAGS = ['@ess', '@svlOblt', '@svlSecurity', '@svlSearch'];

const ERROR_MSG =
  'Use the `tags` helper from @kbn/scout (e.g. `tags.stateful.classic`, `tags.serverless.observability.complete`) instead of deprecated string tags like `@ess` or `@svlOblt`.';

/**
 * Checks if a node represents a method describe() call (e.g., test.describe, apiTest.describe)
 * @param {CallExpression} node
 * @returns {boolean}
 */
const isDescribeCall = (node) => {
  return (
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'describe'
  );
};

/**
 * Extracts string literals from an AST node (handles array elements and spread).
 * @param {import('@typescript-eslint/typescript-estree').TSESTree.Node} node
 * @returns {string[]}
 */
const getStringLiteralsFromNode = (node) => {
  if (!node) return [];

  if (node.type === 'ArrayExpression') {
    return node.elements.flatMap((el) => getStringLiteralsFromNode(el));
  }

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return [node.value];
  }

  return [];
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow deprecated Scout test tags (@ess, @svlOblt, @svlSecurity, @svlSearch). Use the `tags` helper from @kbn/scout instead.',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [],
    messages: {
      deprecatedTag: ERROR_MSG,
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        if (!isDescribeCall(node) || node.arguments.length < 2) {
          return;
        }

        const optionsArg = node.arguments[1];
        if (optionsArg.type !== 'ObjectExpression') {
          return;
        }

        const tagProperty = optionsArg.properties.find(
          (prop) =>
            prop.type === 'Property' && prop.key.type === 'Identifier' && prop.key.name === 'tag'
        );

        if (!tagProperty || tagProperty.type !== 'Property') {
          return;
        }

        const tagValue = tagProperty.value;
        const stringLiterals = getStringLiteralsFromNode(tagValue);

        for (const literal of stringLiterals) {
          if (DEPRECATED_TAGS.includes(literal)) {
            context.report({
              node: tagProperty,
              messageId: 'deprecatedTag',
            });
            return;
          }
        }
      },
    };
  },
};
