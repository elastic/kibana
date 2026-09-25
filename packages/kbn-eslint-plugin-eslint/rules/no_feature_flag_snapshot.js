/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');
const findKibanaRoot = require('../helpers/find_kibana_root');

/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("estree").Node} Node */

const KIBANA_ROOT = findKibanaRoot();
const FLAG_METHODS = new Set(['getBooleanValue$', 'getStringValue$', 'getNumberValue$']);
const ISSUE_URL = 'https://github.com/elastic/kibana/issues/293566';

/**
 * @param {string} filename
 * @returns {boolean}
 */
function isTestFile(filename) {
  const normalized = filename.replace(/\\/g, '/');
  return (
    /\.(test|spec)\.[jt]sx?$/.test(normalized) || /\/__(tests|mocks|fixtures)__\//.test(normalized)
  );
}

/**
 * @param {string} filename
 * @param {string[]} allow
 * @returns {boolean}
 */
function isAllowedFile(filename, allow) {
  const normalized = filename.replace(/\\/g, '/');
  const relative = path.relative(KIBANA_ROOT, filename).split(path.sep).join('/');
  return allow.some((entry) => {
    const normalizedEntry = entry.split(path.sep).join('/');
    return relative === normalizedEntry || normalized.endsWith(`/${normalizedEntry}`);
  });
}

/**
 * @param {Node | null | undefined} node
 * @returns {Node | null | undefined}
 */
function unwrap(node) {
  let current = node;
  while (
    current &&
    (current.type === 'ChainExpression' ||
      current.type === 'TSAsExpression' ||
      current.type === 'TSNonNullExpression' ||
      current.type === 'TSSatisfiesExpression' ||
      current.type === 'ParenthesizedExpression' ||
      current.type === 'AwaitExpression')
  ) {
    current = current.expression;
  }
  return current;
}

/**
 * @param {Node | null | undefined} node
 * @param {string} name
 * @returns {boolean}
 */
function isCallNamed(node, name) {
  const current = unwrap(node);
  if (!current || current.type !== 'CallExpression') {
    return false;
  }
  const callee = unwrap(current.callee);
  if (!callee || callee.type !== 'MemberExpression' || callee.computed) {
    return false;
  }
  return callee.property.type === 'Identifier' && callee.property.name === name;
}

/**
 * @param {Node | null | undefined} node
 * @returns {boolean}
 */
function isFlagMethodCall(node) {
  const current = unwrap(node);
  if (!current || current.type !== 'CallExpression') {
    return false;
  }
  const callee = unwrap(current.callee);
  if (!callee || callee.type !== 'MemberExpression' || callee.computed) {
    return false;
  }
  return callee.property.type === 'Identifier' && FLAG_METHODS.has(callee.property.name);
}

/**
 * @param {import("eslint").Rule.RuleContext} context
 * @param {Node} node
 * @returns {Node | null}
 */
function resolveIdentifierInit(context, node) {
  if (node.type !== 'Identifier') {
    return null;
  }
  const sourceCode = context.getSourceCode();
  let scope = sourceCode.getScope(node);
  while (scope) {
    const variable = scope.set.get(node.name);
    if (variable) {
      const def = variable.defs.find((entry) => entry.type === 'Variable' && entry.node.init);
      return def ? def.node.init : null;
    }
    scope = scope.upper;
  }
  return null;
}

/**
 * @param {import("eslint").Rule.RuleContext} context
 * @param {Node | null | undefined} node
 * @param {Set<string>} seen
 * @returns {boolean}
 */
function expressionReadsFlag(context, node, seen) {
  const current = unwrap(node);
  if (!current) {
    return false;
  }

  if (current.type === 'Identifier') {
    if (seen.has(current.name)) {
      return false;
    }
    seen.add(current.name);
    return expressionReadsFlag(context, resolveIdentifierInit(context, current), seen);
  }

  if (isFlagMethodCall(current)) {
    return true;
  }

  if (current.type === 'CallExpression') {
    return (
      expressionReadsFlag(context, current.callee, seen) ||
      current.arguments.some((arg) => arg && expressionReadsFlag(context, arg, seen))
    );
  }

  if (current.type === 'MemberExpression') {
    return expressionReadsFlag(context, current.object, seen);
  }

  if (current.type === 'ConditionalExpression') {
    return (
      expressionReadsFlag(context, current.test, seen) ||
      expressionReadsFlag(context, current.consequent, seen) ||
      expressionReadsFlag(context, current.alternate, seen)
    );
  }

  if (current.type === 'LogicalExpression' || current.type === 'BinaryExpression') {
    return (
      expressionReadsFlag(context, current.left, seen) ||
      expressionReadsFlag(context, current.right, seen)
    );
  }

  if (current.type === 'SequenceExpression') {
    return current.expressions.some((expr) => expressionReadsFlag(context, expr, seen));
  }

  if (current.type === 'ArrayExpression') {
    return current.elements.some((expr) => expr && expressionReadsFlag(context, expr, seen));
  }

  return false;
}

/**
 * @param {import("eslint").Rule.RuleContext} context
 * @param {Node} node
 * @returns {boolean}
 */
function isFirstValueFromOfFlag(context, node) {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const callee = unwrap(node.callee);
  const isFirstValueFrom =
    (callee && callee.type === 'Identifier' && callee.name === 'firstValueFrom') ||
    isCallNamed(node, 'firstValueFrom');
  if (!isFirstValueFrom) {
    return false;
  }
  const [argument] = node.arguments;
  return Boolean(argument && expressionReadsFlag(context, argument, new Set()));
}

/**
 * @param {import("eslint").Rule.RuleContext} context
 * @param {Node} node
 * @returns {boolean}
 */
function isImmediateUnsubscribeOfFlag(context, node) {
  if (!isCallNamed(node, 'unsubscribe')) {
    return false;
  }
  const callee = unwrap(node.callee);
  const receiver = callee && unwrap(callee.object);
  if (!receiver) {
    return false;
  }
  if (receiver.type === 'Identifier') {
    const init = resolveIdentifierInit(context, receiver);
    return Boolean(init && isSubscribeOfFlag(context, init));
  }
  return isSubscribeOfFlag(context, receiver);
}

/**
 * @param {import("eslint").Rule.RuleContext} context
 * @param {Node} node
 * @returns {boolean}
 */
function isSubscribeOfFlag(context, node) {
  const current = unwrap(node);
  if (!current || !isCallNamed(current, 'subscribe')) {
    return false;
  }
  return expressionReadsFlag(context, current.callee.object, new Set());
}

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow freezing a feature-flag observable on its first emission, except for an explicit allowlist.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      featureFlagSnapshot: `Reading a feature flag with {{api}} keeps the first emission. In an HTTP handler, use context.core.featureFlags.getBooleanValue, getStringValue, or getNumberValue. Otherwise subscribe for as long as the decision should follow the flag. If this function already runs on every action, disable this line and say why. ${ISSUE_URL}`,
    },
  },

  create(context) {
    const filename = context.getFilename();
    const allow = context.options[0]?.allow ?? [];
    if (isTestFile(filename) || isAllowedFile(filename, allow)) {
      return {};
    }

    return {
      CallExpression(node) {
        if (isFirstValueFromOfFlag(context, node)) {
          context.report({
            node,
            messageId: 'featureFlagSnapshot',
            data: { api: 'firstValueFrom' },
          });
          return;
        }
        if (isImmediateUnsubscribeOfFlag(context, node)) {
          context.report({
            node,
            messageId: 'featureFlagSnapshot',
            data: { api: 'subscribe().unsubscribe()' },
          });
        }
      },
    };
  },
};
