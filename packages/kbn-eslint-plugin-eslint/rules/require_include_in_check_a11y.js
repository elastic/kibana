/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const isName = (node, expected) =>
  (node?.type === 'Identifier' && node.name === expected) ||
  (node?.type === 'Literal' && node.value === expected);

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn when page.checkA11y is called without the include option to encourage scoped a11y scans.',
      recommended: false,
    },
    messages: {
      requireIncludeInCheckA11y:
        'We recommend running checkA11y with the include parameter set to the root element you are testing. This makes the tests more isolated and reduces the time required to analyze the DOM structure.',
    },
    schema: [],
  },

  create(context) {
    const isCheckA11yCall = (node) => {
      const callee = node && node.callee;
      if (!callee || callee.type !== 'MemberExpression') return false;
      return isName(callee.property, 'checkA11y');
    };

    const hasIncludeProperty = (objExpr) => {
      for (const prop of objExpr.properties) {
        if (prop.type === 'Property' && isName(prop.key, 'include')) {
          return true;
        }
      }
      return false;
    };

    return {
      CallExpression(node) {
        if (!isCheckA11yCall(node)) return;

        const args = node.arguments || [];
        if (args.length === 0) {
          context.report({ node, messageId: 'requireIncludeInCheckA11y' });
          return;
        }

        const firstArg = args[0];
        if (!firstArg || firstArg.type !== 'ObjectExpression') {
          context.report({ node, messageId: 'requireIncludeInCheckA11y' });
          return;
        }

        if (!hasIncludeProperty(firstArg)) {
          context.report({ node, messageId: 'requireIncludeInCheckA11y' });
        }
      },
    };
  },
};
