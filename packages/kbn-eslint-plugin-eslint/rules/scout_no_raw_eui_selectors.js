/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */

const WATCHED_METHODS = new Set(['locator', '$', '$$', 'waitForSelector']);

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Matches a raw EUI class selector against a restricted entry's `selector`.
 * Entries with `exact: true` require an exact string match. Otherwise the
 * class may appear anywhere in a combined selector (e.g.
 * `[data-test-subj="x"] .euiFoo`) but must end at a class-token boundary, so
 * `.euiFoo` does not flag `.euiFoo__child` or `.euiFooBar`.
 */
function selectorMatches(value, entry) {
  if (entry.exact) return value === entry.selector;
  return new RegExp(`${escapeRegExp(entry.selector)}(?![\\w-])`).test(value);
}

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid raw EUI class selectors in Scout test code where a published ' +
        '@elastic/eui-test-helpers Component Object already covers the same interaction.',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          restricted: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                selector: { type: 'string' },
                exact: { type: 'boolean' },
                replacement: { type: 'string' },
              },
              required: ['selector', 'replacement'],
              additionalProperties: false,
            },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const restricted = options.restricted || [];
    if (restricted.length === 0) return {};

    /** @param {string} value @param {import('estree').Node} node */
    function checkStringValue(value, node) {
      for (const entry of restricted) {
        if (selectorMatches(value, entry)) {
          context.report({
            node,
            message:
              'Raw EUI class selector `{{selector}}` is restricted. Use {{replacement}} instead.',
            data: { selector: entry.selector, replacement: entry.replacement },
          });
          return;
        }
      }
    }

    return {
      CallExpression(node) {
        const { callee } = node;
        if (
          callee.type !== 'MemberExpression' ||
          callee.property.type !== 'Identifier' ||
          !WATCHED_METHODS.has(callee.property.name)
        ) {
          return;
        }

        const firstArg = node.arguments[0];
        if (!firstArg) return;

        if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
          checkStringValue(firstArg.value, node);
        } else if (firstArg.type === 'TemplateLiteral') {
          // Check each static chunk so `${scope} .euiFoo` is still caught.
          for (const quasi of firstArg.quasis) {
            checkStringValue(quasi.value.cooked ?? '', node);
          }
        }
      },
    };
  },
};
