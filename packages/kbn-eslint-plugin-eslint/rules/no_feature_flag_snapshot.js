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
/** @typedef {import("@oxlint/plugins").Scope} Scope */
/** @typedef {import("@oxlint/plugins").Variable} Variable */

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
 * @param {import("eslint").SourceCode} sourceCode
 * @param {Node} node
 * @returns {Variable | null}
 */
function resolveVariable(sourceCode, node) {
  if (node.type !== 'Identifier') {
    return null;
  }
  let scope = /** @type {Scope | null} */ (sourceCode.getScope(node));
  while (scope) {
    const variable = scope.set.get(node.name);
    if (variable) {
      return variable;
    }
    scope = scope.upper;
  }
  return null;
}

/**
 * The expression assigned to `identifier` by the last write that precedes `usage`.
 * Declaration initializers and later assignments both count, so
 * `let flag$; flag$ = featureFlags.getBooleanValue$(...)` is visible to a later read.
 *
 * @param {import("eslint").SourceCode} sourceCode
 * @param {Node} identifier
 * @param {Node} usage
 * @returns {Node | null}
 */
function latestAssignmentBefore(sourceCode, identifier, usage) {
  const variable = resolveVariable(sourceCode, identifier);
  if (!variable || usage.range == null) {
    return null;
  }
  const usagePos = usage.range[0];
  /** @type {Node | null} */
  let latest = null;
  let latestPos = -1;

  /**
   * @param {number | undefined} pos
   * @param {Node | null | undefined} expr
   */
  const consider = (pos, expr) => {
    if (!expr || pos == null || pos >= usagePos || pos < latestPos) {
      return;
    }
    latest = expr;
    latestPos = pos;
  };

  for (const def of variable.defs) {
    if (def.type === 'Variable' && def.node.type === 'VariableDeclarator' && def.node.init) {
      consider(def.node.range?.[0], def.node.init);
    }
  }
  for (const reference of variable.references) {
    if (reference.writeExpr) {
      consider(reference.identifier.range?.[0], reference.writeExpr);
    }
  }
  return latest;
}

/**
 * @param {import("eslint").SourceCode} sourceCode
 * @param {Node} node
 * @returns {Node | null}
 */
function enclosingFunction(sourceCode, node) {
  const ancestors = sourceCode.getAncestors(node);
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const current = ancestors[i];
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'FunctionExpression' ||
      current.type === 'ArrowFunctionExpression'
    ) {
      return current;
    }
  }
  return null;
}

/**
 * @param {import("eslint").SourceCode} sourceCode
 * @param {Node} node
 * @param {Node} ancestor
 * @returns {boolean}
 */
function isNodeInside(sourceCode, node, ancestor) {
  return sourceCode.getAncestors(node).includes(ancestor);
}

/**
 * @param {import("eslint").SourceCode} sourceCode
 * @param {Node} node
 * @param {Node} subscribeCall
 * @returns {boolean}
 */
function isInsideSubscribeHandler(sourceCode, node, subscribeCall) {
  return subscribeCall.arguments.some((arg) => {
    const handler = unwrap(arg);
    return (
      handler &&
      (handler.type === 'ArrowFunctionExpression' || handler.type === 'FunctionExpression') &&
      isNodeInside(sourceCode, node, handler)
    );
  });
}

/**
 * @param {import("eslint").SourceCode} sourceCode
 * @param {Node | null | undefined} node
 * @param {Set<string>} seen
 * @returns {boolean}
 */
function expressionReadsFlag(sourceCode, node, seen) {
  const current = unwrap(node);
  if (!current) {
    return false;
  }

  if (current.type === 'Identifier') {
    if (seen.has(current.name)) {
      return false;
    }
    seen.add(current.name);
    return expressionReadsFlag(
      sourceCode,
      latestAssignmentBefore(sourceCode, current, current),
      seen
    );
  }

  if (isFlagMethodCall(current)) {
    return true;
  }

  if (current.type === 'CallExpression') {
    return (
      expressionReadsFlag(sourceCode, current.callee, seen) ||
      current.arguments.some((arg) => arg && expressionReadsFlag(sourceCode, arg, seen))
    );
  }

  if (current.type === 'MemberExpression') {
    return expressionReadsFlag(sourceCode, current.object, seen);
  }

  if (current.type === 'ConditionalExpression') {
    return (
      expressionReadsFlag(sourceCode, current.test, seen) ||
      expressionReadsFlag(sourceCode, current.consequent, seen) ||
      expressionReadsFlag(sourceCode, current.alternate, seen)
    );
  }

  if (current.type === 'LogicalExpression' || current.type === 'BinaryExpression') {
    return (
      expressionReadsFlag(sourceCode, current.left, seen) ||
      expressionReadsFlag(sourceCode, current.right, seen)
    );
  }

  if (current.type === 'SequenceExpression') {
    return current.expressions.some((expr) => expressionReadsFlag(sourceCode, expr, seen));
  }

  if (current.type === 'ArrayExpression') {
    return current.elements.some((expr) => expr && expressionReadsFlag(sourceCode, expr, seen));
  }

  return false;
}

/**
 * @param {import("eslint").SourceCode} sourceCode
 * @param {Node} node
 * @returns {boolean}
 */
function isFirstValueFromOfFlag(sourceCode, node) {
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
  return Boolean(argument && expressionReadsFlag(sourceCode, argument, new Set()));
}

/**
 * @param {import("eslint").SourceCode} sourceCode
 * @param {Node} node
 * @returns {boolean}
 */
function isImmediateUnsubscribeOfFlag(sourceCode, node) {
  if (!isCallNamed(node, 'unsubscribe')) {
    return false;
  }
  const callee = unwrap(node.callee);
  const receiver = callee && unwrap(callee.object);
  if (!receiver) {
    return false;
  }
  if (receiver.type === 'Identifier') {
    return isSynchronousUnsubscribeOfFlag(sourceCode, node, receiver);
  }
  return isSubscribeOfFlag(sourceCode, receiver);
}

/**
 * `subscription.unsubscribe()` in the same function that subscribed reads one
 * emission and drops the rest. A later cleanup (`return () => subscription.unsubscribe()`)
 * keeps the subscription until that function runs.
 *
 * @param {import("eslint").SourceCode} sourceCode
 * @param {Node} unsubscribeNode
 * @param {Node} identifier
 * @returns {boolean}
 */
function isSynchronousUnsubscribeOfFlag(sourceCode, unsubscribeNode, identifier) {
  const assigned = latestAssignmentBefore(sourceCode, identifier, unsubscribeNode);
  if (!assigned || !isSubscribeOfFlag(sourceCode, assigned)) {
    return false;
  }
  const subscribeCall = unwrap(assigned);
  if (subscribeCall && isInsideSubscribeHandler(sourceCode, unsubscribeNode, subscribeCall)) {
    return true;
  }
  return enclosingFunction(sourceCode, unsubscribeNode) === enclosingFunction(sourceCode, assigned);
}

/**
 * @param {import("eslint").SourceCode} sourceCode
 * @param {Node} node
 * @returns {boolean}
 */
function isSubscribeOfFlag(sourceCode, node) {
  const current = unwrap(node);
  if (!current || !isCallNamed(current, 'subscribe')) {
    return false;
  }
  const callee = unwrap(current.callee);
  return Boolean(
    callee &&
      callee.type === 'MemberExpression' &&
      expressionReadsFlag(sourceCode, callee.object, new Set())
  );
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

  createOnce(context) {
    /** @type {import("eslint").SourceCode} */
    let sourceCode;
    let skip = false;

    return {
      before() {
        sourceCode = context.sourceCode;
        const allow = context.options[0]?.allow ?? [];
        skip = isTestFile(context.filename) || isAllowedFile(context.filename, allow);
      },
      CallExpression(node) {
        if (skip) {
          return;
        }
        if (isFirstValueFromOfFlag(sourceCode, node)) {
          context.report({
            node,
            messageId: 'featureFlagSnapshot',
            data: { api: 'firstValueFrom' },
          });
          return;
        }
        if (isImmediateUnsubscribeOfFlag(sourceCode, node)) {
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
