/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */

// The page/frame methods that accept raw CSS/XPath selectors
const WATCHED_METHODS = new Set(['locator', 'frameLocator', 'waitForSelector', '$', '$$']);

// Any selector beginning with a data-test-subj attribute lookup is safe
const TEST_SUBJ_PREFIX = '[data-test-subj';

/**
 * Returns true when the callee chain contains `.testSubj.<method>`, i.e. the
 * idiomatic Scout wrapper that guarantees only data-test-subj values are used.
 */
function isTestSubjCall(callee) {
  return (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'MemberExpression' &&
    callee.object.property.type === 'Identifier' &&
    callee.object.property.name === 'testSubj'
  );
}

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Encourage use of page.testSubj.locator() or [data-test-subj=...] attribute selectors ' +
        'instead of raw CSS/XPath in Scout tests.',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [],
    messages: {
      noRawLocator:
        'Avoid raw CSS/XPath locators in Scout tests. ' +
        "Prefer `page.testSubj.locator('selector')` or `page.locator('[data-test-subj=\"selector\"]')`. " +
        'Add a data-test-subj attribute to the component if one is missing.',
    },
  },

  createOnce(context) {
    return {
      CallExpression(node) {
        const { callee } = node;

        // Only watch the guarded method names
        if (
          callee.type !== 'MemberExpression' ||
          callee.property.type !== 'Identifier' ||
          !WATCHED_METHODS.has(callee.property.name)
        ) {
          return;
        }

        // Skip `page.testSubj.locator(...)` — the idiomatic Scout API, already safe
        if (isTestSubjCall(callee)) {
          return;
        }

        const firstArg = node.arguments[0];
        if (!firstArg) return;

        // String literal: check for the data-test-subj prefix
        if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
          if (!firstArg.value.startsWith(TEST_SUBJ_PREFIX)) {
            context.report({ node, messageId: 'noRawLocator' });
          }
          return;
        }

        // Template literal: inspect the leading static chunk for the prefix. One that opens with
        // an interpolation, e.g. `${euiSelectors.contextMenu.PANEL_SELECTOR} ...`, has no prefix
        // to judge, so it is left alone rather than assumed to be raw CSS.
        if (firstArg.type === 'TemplateLiteral') {
          const firstChunk = firstArg.quasis[0]?.value.cooked ?? '';
          if (firstChunk === '' && firstArg.expressions.length > 0) {
            return;
          }

          if (!firstChunk.startsWith(TEST_SUBJ_PREFIX)) {
            context.report({ node, messageId: 'noRawLocator' });
          }
        }
      },
    };
  },
};
