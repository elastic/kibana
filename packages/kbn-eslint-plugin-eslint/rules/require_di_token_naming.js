/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const CONVENTION_PATTERN = /^[a-z][a-zA-Z0-9]*\.[A-Z][a-zA-Z0-9]*$/;

const CORE_TOKENS = new Set(['Global', 'Setup', 'Start', 'OnSetup', 'OnStart', 'Scope', 'Fork']);

const PLATFORM_PREFIX_PATTERN = /^plugin\.(setup|start)\./;

/**
 * @param {string} value
 * @returns {boolean}
 */
const isAllowedToken = (value) =>
  CORE_TOKENS.has(value) || PLATFORM_PREFIX_PATTERN.test(value) || CONVENTION_PATTERN.test(value);

/** @typedef {import("eslint").Rule.RuleModule} Rule */

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce `<pluginId>.<ServiceName>` naming for `Symbol.for()` DI tokens cast as `ServiceIdentifier`.',
      category: 'Best Practices',
      recommended: false,
    },
    schema: [],
    messages: {
      badTokenName:
        'DI token "{{value}}" should follow the <pluginId>.<ServiceName> convention (e.g. "myPlugin.MyService").',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.object.type !== 'Identifier' ||
          node.callee.object.name !== 'Symbol' ||
          node.callee.property.type !== 'Identifier' ||
          node.callee.property.name !== 'for'
        ) {
          return;
        }

        const arg = node.arguments[0];
        if (!arg || arg.type !== 'Literal' || typeof arg.value !== 'string') {
          return;
        }

        const { parent } = node;
        if (
          !parent ||
          parent.type !== 'TSAsExpression' ||
          parent.typeAnnotation.type !== 'TSTypeReference'
        ) {
          return;
        }

        const { typeName } = parent.typeAnnotation;
        const name = typeName.type === 'Identifier' ? typeName.name : undefined;
        if (name !== 'ServiceIdentifier') {
          return;
        }

        if (!isAllowedToken(arg.value)) {
          context.report({
            node: arg,
            messageId: 'badTokenName',
            data: { value: arg.value },
          });
        }
      },
    };
  },
};
