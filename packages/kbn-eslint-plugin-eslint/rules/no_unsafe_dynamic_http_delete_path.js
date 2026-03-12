/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const tsEstree = require('@typescript-eslint/typescript-estree');
const esTypes = tsEstree.AST_NODE_TYPES;

/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.CallExpression} CallExpression */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Expression} Expression */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.MemberExpression} MemberExpression */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Node} Node */

const ERROR_MSG =
  'Dangerous use of http.delete(). Use buildPath() from `@kbn/core-http-browser` or encodeURIComponent() so path params are encoded safely.';

/**
 * Limitations:
 * - This rule only inspects inline path expressions passed as the first argument to `http.delete(...)`.
 * - It does not perform data-flow analysis, so `const path = \`/api/${id}\`; http.delete(path)` is not flagged.
 * - It only targets `.delete(...)` calls on `http`-like receivers (`http`, `this.http`, `foo.http`, etc.).
 * - It treats `encodeURIComponent(...)` as a safe escape hatch, but it does not verify that callers are
 *   encoding the correct path segment or using the best API shape for the route.
 */

/**
 * @param {Node} node
 * @returns {node is MemberExpression}
 */
const isMemberExpression = (node) => node.type === esTypes.MemberExpression;

/**
 * @param {Node} node
 * @returns {boolean}
 */
const isHttpReference = (node) => {
  if (node.type === esTypes.Identifier) {
    return node.name === 'http';
  }

  if (!isMemberExpression(node) || node.computed || node.property.type !== esTypes.Identifier) {
    return false;
  }

  if (node.property.name === 'http') {
    return true;
  }

  return isHttpReference(node.object);
};

/**
 * @param {Node} node
 * @returns {boolean}
 */
const isUsingEncodeURIComponent = (node) => {
  if (node.type === esTypes.CallExpression) {
    const { callee } = node;

    if (callee.type === esTypes.Identifier) {
      return callee.name === 'encodeURIComponent';
    }

    return (
      callee.type === esTypes.MemberExpression &&
      !callee.computed &&
      callee.property.type === esTypes.Identifier &&
      callee.property.name === 'encodeURIComponent'
    );
  }

  if (node.type === esTypes.BinaryExpression && node.operator === '+') {
    return isUsingEncodeURIComponent(node.left) && isUsingEncodeURIComponent(node.right);
  }

  if (node.type === esTypes.ConditionalExpression) {
    return isUsingEncodeURIComponent(node.consequent) && isUsingEncodeURIComponent(node.alternate);
  }

  return false;
};

/**
 * @param {Node} node
 * @returns {boolean}
 */
const isSafePathSegmentExpression = (node) => {
  if (node.type === esTypes.Literal) {
    return true;
  }

  if (isUsingEncodeURIComponent(node)) {
    return true;
  }

  if (node.type === esTypes.TemplateLiteral) {
    return node.expressions.every((expression) => isSafePathSegmentExpression(expression));
  }

  if (node.type === esTypes.BinaryExpression && node.operator === '+') {
    return isSafePathSegmentExpression(node.left) && isSafePathSegmentExpression(node.right);
  }

  if (node.type === esTypes.ConditionalExpression) {
    return (
      isSafePathSegmentExpression(node.consequent) && isSafePathSegmentExpression(node.alternate)
    );
  }

  return false;
};

/**
 * @param {Expression | import("@typescript-eslint/typescript-estree").TSESTree.SpreadElement} node
 * @returns {boolean}
 */
const isDynamicPathExpression = (node) => {
  if (node.type === esTypes.SpreadElement) {
    return false;
  }

  if (node.type === esTypes.TemplateLiteral) {
    return !isSafePathSegmentExpression(node);
  }

  if (node.type === esTypes.BinaryExpression && node.operator === '+') {
    return !isSafePathSegmentExpression(node);
  }

  if (node.type === esTypes.ConditionalExpression) {
    return !isSafePathSegmentExpression(node);
  }

  return false;
};

/**
 * @param {CallExpression} node
 * @returns {boolean}
 */
const isHttpDeleteCall = (node) => {
  if (
    node.callee.type !== esTypes.MemberExpression ||
    node.callee.computed ||
    node.callee.property.type !== esTypes.Identifier ||
    node.callee.property.name !== 'delete'
  ) {
    return false;
  }

  return isHttpReference(node.callee.object);
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow dynamically building inline paths in http.delete calls so callers use buildPath instead',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(_) {
        const node = /** @type {CallExpression} */ (_);
        if (!isHttpDeleteCall(node) || node.arguments.length === 0) {
          return;
        }

        const [pathArgument] = node.arguments;
        if (!isDynamicPathExpression(pathArgument)) {
          return;
        }

        context.report({
          node: pathArgument,
          message: ERROR_MSG,
        });
      },
    };
  },
};
