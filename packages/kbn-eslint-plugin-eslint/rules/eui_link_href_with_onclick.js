/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */

const ERROR_MSG =
  '<EuiLink> with `onClick` should also have an `href` for proper link semantics and accessibility. Without `href`, the component renders as a `<button>` instead of an `<a>`.';

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      euiLinkHrefWithOnclick: ERROR_MSG,
    },
  },
  create: (context) => ({
    JSXOpeningElement(node) {
      if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'EuiLink') {
        return;
      }

      const hasOnClick = node.attributes.some(
        (attr) => attr.type === 'JSXAttribute' && attr.name.name === 'onClick'
      );
      const hasHref = node.attributes.some(
        (attr) => attr.type === 'JSXAttribute' && attr.name.name === 'href'
      );

      if (hasOnClick && !hasHref) {
        context.report({
          node,
          messageId: 'euiLinkHrefWithOnclick',
        });
      }
    },
  }),
};
