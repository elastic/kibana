/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.CallExpression} CallExpression */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Identifier} Identifier */

const ERROR_MSG = 'API tests must not use the kbnClient fixture.';

const traverse = require('eslint-traverse');

const isApiTestCall = (node) => node.callee.type === 'Identifier' && node.callee.name === 'apiTest';

/** Get local param name for `kbnClient` (supports `{ kbnClient: alias }`). */
const getKbnClientLocalName = (fnNode) => {
  const firstParam = fnNode.params[0];
  if (!firstParam || firstParam.type !== 'ObjectPattern') {
    return 'kbnClient';
  }

  const prop = firstParam.properties.find((p) => {
    if (p.type === 'RestElement') return false;
    return p.key && p.key.name === 'kbnClient';
  });

  return prop?.value?.name || 'kbnClient';
};

/** Helper: Check if an identifier is used anywhere in a function body (simple recursion). */
const paramUsesIdentifierInBody = (node, paramName) => {
  if (!node || typeof node !== 'object') return false;

  if (node.type === 'Identifier' && node.name === paramName) return true;

  for (const key in node) {
    if (
      key === 'parent' ||
      key === 'loc' ||
      key === 'range' ||
      key === 'leadingComments' ||
      key === 'trailingComments'
    ) {
      continue;
    }
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (paramUsesIdentifierInBody(item, paramName)) return true;
      }
    } else if (value && typeof value === 'object') {
      if (paramUsesIdentifierInBody(value, paramName)) return true;
    }
  }
  return false;
};

/**
 * Determine whether `fnNode` uses `kbnClient`.
 *
 * Strategy: Single-pass traversal that:
 * 1. Collects variable aliases pointing to kbnClient (e.g., `const client = kbnClient`)
 * 2. Collects local function definitions and their parameter usage
 * 3. Detects member access on kbnClient or calls passing kbnClient to functions that use it
 */
const functionUsesKbnClient = (fnNode, context) => {
  const kbnClientName = getKbnClientLocalName(fnNode);
  const variableAliases = new Set([kbnClientName]);
  const localFnUsesParam = new Map();
  let found = false;

  traverse(context, fnNode.body, (path) => {
    if (found) return traverse.SKIP;

    const node = path.node;

    if (node.type === 'VariableDeclarator' && node.init && node.id?.type === 'Identifier') {
      if (node.init.type === 'Identifier' && variableAliases.has(node.init.name)) {
        variableAliases.add(node.id.name);
      }

      if (node.init.type === 'FunctionExpression' || node.init.type === 'ArrowFunctionExpression') {
        const fnName = node.id.name;
        const paramName = getKbnClientLocalName(node.init);
        localFnUsesParam.set(fnName, paramUsesIdentifierInBody(node.init.body, paramName));
      }
    }

    if (node.type === 'FunctionDeclaration' && node.id?.type === 'Identifier') {
      const fnName = node.id.name;
      const paramName = getKbnClientLocalName(node);
      localFnUsesParam.set(fnName, paramUsesIdentifierInBody(node.body, paramName));
    }

    if (
      node.type === 'MemberExpression' &&
      node.object?.type === 'Identifier' &&
      variableAliases.has(node.object.name)
    ) {
      found = true;
      return traverse.SKIP;
    }

    if (node.type === 'CallExpression' && node.arguments) {
      for (const arg of node.arguments) {
        if (arg.type === 'Identifier' && variableAliases.has(arg.name)) {
          const callee = node.callee;
          if (callee.type === 'Identifier' && localFnUsesParam.has(callee.name)) {
            if (localFnUsesParam.get(callee.name)) {
              found = true;
              return traverse.SKIP;
            }
          } else {
            found = true;
            return traverse.SKIP;
          }
        }
      }
    }
  });

  return found;
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Discourage `kbnClient` fixture usage in API tests.',
      category: 'Best Practices',
    },
    fixable: null,
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        if (!isApiTestCall(node)) return;

        const callbackArg = node.arguments[node.arguments.length - 1];
        if (
          !callbackArg ||
          (callbackArg.type !== 'ArrowFunctionExpression' &&
            callbackArg.type !== 'FunctionExpression')
        ) {
          return;
        }

        const sourceCode = context.getSourceCode();
        const comments = sourceCode.getCommentsBefore(node);
        if (
          comments.some((c) =>
            /eslint-disable-next-line\s+@kbn\/eslint\/scout_api_test_discourage_kbn_client/.test(
              c.value
            )
          )
        ) {
          return;
        }

        if (functionUsesKbnClient(callbackArg, context)) {
          context.report({
            node,
            message: ERROR_MSG,
          });
        }
      },
    };
  },
};
