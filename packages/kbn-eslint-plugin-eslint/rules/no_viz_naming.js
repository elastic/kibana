/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("eslint").Rule.RuleFixer} Fixer */

const VIZ_PATTERN = /[Vv]iz/;

/**
 * Replace "viz" with "vis" and "Viz" with "Vis" in a string.
 * @param {string} name
 * @returns {string}
 */
const fixName = (name) => name.replace(/Viz/g, 'Vis').replace(/viz/g, 'vis');

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce "vis" / "Vis" spelling instead of "viz" / "Viz" in identifiers.',
    },
    fixable: 'code',
    schema: [],
    messages: {
      noViz: 'Use "vis" instead of "viz" in identifier "{{name}}". Preferred: "{{fixed}}".',
    },
  },
  create: (context) => ({
    Identifier(node) {
      const { name } = node;
      if (!VIZ_PATTERN.test(name)) {
        return;
      }

      const fixed = fixName(name);

      context.report({
        node,
        messageId: 'noViz',
        data: { name, fixed },
        fix: (fixer) => fixer.replaceText(node, fixed),
      });
    },
  }),
};
