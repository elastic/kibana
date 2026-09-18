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
 * Reads every `Eui<Component>Selectors` object exported by
 * `@elastic/eui-test-helpers` and collects its `*_SELECTOR` CSS class values.
 * The list therefore grows with the helpers package and is never maintained
 * by hand. Returns an empty list if the installed version exports no
 * selectors, in which case the rule reports nothing.
 */
function loadEuiSelectors() {
  let helpers;
  try {
    helpers = require('@elastic/eui-test-helpers');
  } catch {
    return [];
  }

  const entries = [];
  for (const [exportName, value] of Object.entries(helpers)) {
    const match = /^(Eui\w+)Selectors$/.exec(exportName);
    if (!match || !value || typeof value !== 'object') continue;

    const component = match[1];
    for (const [key, selector] of Object.entries(value)) {
      if (
        key.endsWith('_SELECTOR') &&
        typeof selector === 'string' &&
        selector.startsWith('.eui')
      ) {
        entries.push({ selector, component, object: `${component}Object` });
      }
    }
  }
  return entries;
}

let cachedEntries;
const getEntries = () => {
  if (!cachedEntries) cachedEntries = loadEuiSelectors();
  return cachedEntries;
};

/**
 * A restricted class may appear anywhere in a combined selector (e.g.
 * `[data-test-subj="x"] .euiFoo`) but must end at a class-token boundary, so
 * `.euiFoo` does not flag `.euiFoo__child` or `.euiFooBar`.
 */
function findMatch(value, entries) {
  return entries.find((entry) =>
    new RegExp(`${escapeRegExp(entry.selector)}(?![\\w-])`).test(value)
  );
}

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid hand-written EUI class selectors in Scout test code for components that ' +
        'have an @elastic/eui-test-helpers Component Object.',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [],
  },

  create(context) {
    const entries = getEntries();
    if (entries.length === 0) return {};

    /** @param {string} value @param {import('estree').Node} node */
    function checkStringValue(value, node) {
      const entry = findMatch(value, entries);
      if (!entry) return;
      context.report({
        node,
        message:
          '`{{selector}}` is an internal of {{component}}. Use the {{object}} Component Object ' +
          'from @elastic/eui-test-helpers (page.components in Scout). If no method covers your ' +
          'case, build the locator from the exported {{component}}Selectors constants instead.',
        data: entry,
      });
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

module.exports.loadEuiSelectors = loadEuiSelectors;
