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

const HTTP_REQUEST_METHOD_NAMES = new Set([
  'delete',
  'fetch',
  'get',
  'head',
  'options',
  'patch',
  'post',
  'put',
]);
const WARN_MSG =
  'Dangerous use of dynamic http path. Use buildPath() from `@kbn/core-http-browser` or encodeURIComponent() so path params are encoded safely.';
const ALL_CAPS_IDENTIFIER_PATTERN = /^[A-Z][A-Z0-9_]*$/;

/**
 * Limitations:
 * - This rule only inspects inline path expressions passed directly as the first argument to `http` request calls,
 *   or inline `path` properties in the object overload (for example `http.get({ path: ... })`).
 * - It does not perform data-flow analysis, so `const path = \`/api/${id}\`; http.delete(path)` is not flagged.
 * - It only targets standard HTTP verb calls and `http.fetch(...)` on `http`-like receivers
 *   (`http`, `this.http`, `foo.http`, etc.).
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
const isAllCapsIdentifier = (node) => {
  return node.type === esTypes.Identifier && ALL_CAPS_IDENTIFIER_PATTERN.test(node.name);
};

/**
 * @param {Node} node
 * @returns {boolean}
 */
const isSafePathPrefixReference = (node) => {
  if (isAllCapsIdentifier(node)) {
    return true;
  }

  if (
    node.type !== esTypes.MemberExpression ||
    node.computed ||
    node.property.type !== esTypes.Identifier
  ) {
    return false;
  }

  return isSafePathPrefixReference(node.object);
};

/**
 * @param {Node} node
 * @returns {boolean}
 */
const isPathExpressionStartingWithSlash = (node) => {
  if (node.type === esTypes.Literal) {
    return typeof node.value === 'string' && node.value.startsWith('/');
  }

  if (node.type === esTypes.TemplateLiteral) {
    const cooked = node.quasis[0].value.cooked;
    return typeof cooked === 'string' && cooked.startsWith('/');
  }

  if (node.type === esTypes.BinaryExpression && node.operator === '+') {
    return isPathExpressionStartingWithSlash(node.left);
  }

  if (node.type === esTypes.ConditionalExpression) {
    return (
      isPathExpressionStartingWithSlash(node.consequent) &&
      isPathExpressionStartingWithSlash(node.alternate)
    );
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
    return isSafeTemplateLiteralPath(node);
  }

  if (node.type === esTypes.BinaryExpression && node.operator === '+') {
    return (
      (isSafePathSegmentExpression(node.left) && isSafePathSegmentExpression(node.right)) ||
      (isSafePathPrefixReference(node.left) &&
        isPathExpressionStartingWithSlash(node.right) &&
        isSafePathSegmentExpression(node.right))
    );
  }

  if (node.type === esTypes.ConditionalExpression) {
    return (
      isSafePathSegmentExpression(node.consequent) && isSafePathSegmentExpression(node.alternate)
    );
  }

  return false;
};

/**
 * @param {import("@typescript-eslint/typescript-estree").TSESTree.TemplateLiteral} node
 * @returns {boolean}
 */
function isSafeTemplateLiteralPath(node) {
  return node.expressions.every((expression, index) => {
    if (isSafePathSegmentExpression(expression)) {
      return true;
    }

    const afterExpr = node.quasis[1]?.value.cooked;
    return (
      index === 0 &&
      isSafePathPrefixReference(expression) &&
      node.quasis[0].value.cooked === '' &&
      typeof afterExpr === 'string' &&
      afterExpr.startsWith('/')
    );
  });
}

/**
 * @param {Expression} node
 * @returns {boolean}
 */
const isDynamicPathExpression = (node) => {
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
const isHttpRequestCall = (node) => {
  if (
    node.callee.type !== esTypes.MemberExpression ||
    node.callee.computed ||
    node.callee.property.type !== esTypes.Identifier ||
    !HTTP_REQUEST_METHOD_NAMES.has(node.callee.property.name)
  ) {
    return false;
  }

  return isHttpReference(node.callee.object);
};

/**
 * @param {Expression | import("@typescript-eslint/typescript-estree").TSESTree.SpreadElement} node
 * @returns {Expression | undefined}
 */
const getPathExpression = (node) => {
  if (node.type === esTypes.SpreadElement) {
    return undefined;
  }

  if (node.type !== esTypes.ObjectExpression) {
    return node;
  }

  for (const property of node.properties) {
    if (property.type !== esTypes.Property || property.computed || property.kind !== 'init') {
      continue;
    }

    const isPathKey =
      (property.key.type === esTypes.Identifier && property.key.name === 'path') ||
      (property.key.type === esTypes.Literal && property.key.value === 'path');

    if (isPathKey) {
      return property.value;
    }
  }

  return undefined;
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow dynamically building inline paths in http request calls so callers use buildPath instead',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(_) {
        const node = /** @type {CallExpression} */ (_);
        if (!isHttpRequestCall(node) || node.arguments.length === 0) {
          return;
        }

        const [firstArgument] = node.arguments;
        const pathExpression = getPathExpression(firstArgument);
        if (!pathExpression || !isDynamicPathExpression(pathExpression)) {
          return;
        }

        context.report({
          node: pathExpression,
          message: WARN_MSG,
        });
      },
    };
  },
};
