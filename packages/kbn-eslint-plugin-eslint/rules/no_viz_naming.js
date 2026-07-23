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

const VIZ_PATTERN = /(?<!i)viz|Viz/;

/**
 * Replace "viz" with "vis" and "Viz" with "Vis" in a string.
 * Lowercase "viz" preceded by "i" is left unchanged to avoid false positives
 * in words formed from "-ive" adjectives, such as "relativize".
 * @param {string} name
 * @returns {string}
 */
const fixName = (name) => name.replace(/Viz/g, 'Vis').replace(/(?<!i)viz/g, 'vis');

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
      noVizLiteral: 'Use "vis" instead of "viz" in string "{{name}}". Preferred: "{{fixed}}".',
      noVizFile: 'Use "vis" instead of "viz" in filename "{{name}}". Rename to "{{fixed}}".',
    },
  },
  create: (context) => ({
    Program(node) {
      const filename = context.getFilename();
      const basename = filename.split('/').pop() || '';
      if (VIZ_PATTERN.test(basename)) {
        const fixed = fixName(basename);
        context.report({
          node,
          messageId: 'noVizFile',
          data: { name: basename, fixed },
        });
      }
    },
    Literal(node) {
      if (typeof node.value !== 'string' || !VIZ_PATTERN.test(node.value)) {
        return;
      }

      const fixed = fixName(node.value);
      const raw = context.getSourceCode().getText(node);

      context.report({
        node,
        messageId: 'noVizLiteral',
        data: { name: node.value, fixed },
        fix: (fixer) => fixer.replaceText(node, fixName(raw)),
      });
    },
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
        fix: (fixer) => fixer.replaceTextRange([node.range[0], node.range[0] + name.length], fixed),
      });
    },
  }),
};
