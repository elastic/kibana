/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */

const WATCHED_METHODS = new Set(['locator', 'waitForSelector']);

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid specific testSubj locators in Scout tests',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          forbidden: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const forbidden = new Set(options.forbidden || []);
    if (forbidden.size === 0) return {};

    return {
      CallExpression(node) {
        const { callee } = node;

        // Match *.testSubj.<locator|waitForSelector>('...')
        if (
          callee.type !== 'MemberExpression' ||
          callee.property.type !== 'Identifier' ||
          !WATCHED_METHODS.has(callee.property.name) ||
          callee.object.type !== 'MemberExpression' ||
          callee.object.property.type !== 'Identifier' ||
          callee.object.property.name !== 'testSubj'
        ) {
          return;
        }

        const firstArg = node.arguments[0];
        if (!firstArg || firstArg.type !== 'Literal' || typeof firstArg.value !== 'string') return;

        if (forbidden.has(firstArg.value)) {
          const method = callee.property.name;
          context.report({
            node,
            message: `The locator \`testSubj.{{method}}('{{name}}')\` is forbidden. Tests should not depend on this element.`,
            data: { method, name: firstArg.value },
          });
        }
      },
    };
  },
};
