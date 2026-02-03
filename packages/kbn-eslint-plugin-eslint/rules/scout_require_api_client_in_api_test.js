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

const ERROR_MSG =
  'The `apiClient` fixture should be used in `apiTest` to call an endpoint and later verify response code and body.';

const traverse = require('eslint-traverse');

const isApiTestCall = (node) => node.callee.type === 'Identifier' && node.callee.name === 'apiTest';

/** Get local param name for `apiClient` (supports `{ apiClient: alias }`). */
const getApiClientLocalName = (fnNode) => {
  const firstParam = fnNode.params[0];
  if (!firstParam || firstParam.type !== 'ObjectPattern') {
    return 'apiClient';
  }

  const apiClientProp = firstParam.properties.find((prop) => {
    if (prop.type === 'RestElement') return false;
    return prop.key && prop.key.name === 'apiClient';
  });

  return apiClientProp?.value?.name || 'apiClient';
};

/** Helper: Check if an identifier is used anywhere in a function body (simple recursion). */
const paramUsesIdentifierInBody = (node, paramName) => {
  if (!node || typeof node !== 'object') return false;

  // Direct match
  if (node.type === 'Identifier' && node.name === paramName) return true;

  // Recurse into object properties
  for (const key in node) {
    // Skip non-traversable properties
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
 * Determine whether `fnNode` uses `apiClient`.
 *
 * Strategy: Single-pass traversal that:
 * 1. Collects variable aliases pointing to apiClient (e.g., `const client = apiClient`)
 * 2. Collects local function definitions and their parameter usage
 * 3. Detects member access on apiClient or calls passing apiClient to functions that use it
 *
 * We avoid the ESLint scope manager to maintain consistency with other rules in this package.
 */
const functionUsesApiClient = (fnNode, context) => {
  const apiClientName = getApiClientLocalName(fnNode);
  const variableAliases = new Set([apiClientName]);
  const localFnUsesParam = new Map();
  let found = false;

  traverse(context, fnNode.body, (path) => {
    if (found) return traverse.SKIP;

    const node = path.node;

    // Collect variable aliases and local function definitions in one pass
    if (node.type === 'VariableDeclarator' && node.init && node.id?.type === 'Identifier') {
      // Track variable aliases (e.g., `const client = apiClient;`)
      if (node.init.type === 'Identifier' && variableAliases.has(node.init.name)) {
        variableAliases.add(node.id.name);
      }

      // Pre-compute parameter usage for local function expressions
      if (node.init.type === 'FunctionExpression' || node.init.type === 'ArrowFunctionExpression') {
        const fnName = node.id.name;
        const paramName = getApiClientLocalName(node.init);
        localFnUsesParam.set(fnName, paramUsesIdentifierInBody(node.init.body, paramName));
        // Skip traversing into nested function bodies to avoid false positives
        return traverse.SKIP;
      }
    }

    // Collect function declarations and pre-compute parameter usage
    if (node.type === 'FunctionDeclaration' && node.id?.type === 'Identifier') {
      const fnName = node.id.name;
      const paramName = getApiClientLocalName(node);
      localFnUsesParam.set(fnName, paramUsesIdentifierInBody(node.body, paramName));
      // Skip traversing into nested function bodies to avoid false positives
      return traverse.SKIP;
    }

    // Detect member access on apiClient (e.g., `apiClient.get(...)`)
    if (
      node.type === 'MemberExpression' &&
      node.object?.type === 'Identifier' &&
      variableAliases.has(node.object.name)
    ) {
      found = true;
      return traverse.SKIP;
    }

    // Detect calls with apiClient passed as argument
    if (node.type === 'CallExpression' && node.arguments) {
      for (const arg of node.arguments) {
        if (arg.type === 'Identifier' && variableAliases.has(arg.name)) {
          const callee = node.callee;
          // For local functions, check if they use their parameter; for external, assume they do
          if (callee.type === 'Identifier' && localFnUsesParam.has(callee.name)) {
            if (localFnUsesParam.get(callee.name)) {
              found = true;
              return traverse.SKIP;
            }
          } else {
            // External call or member-based call; assume external helper uses it
            found = true;
            return traverse.SKIP;
          }
        }
      }

      // Also check if a local function is called that uses apiClient from closure (no args needed)
      const callee = node.callee;
      if (callee.type === 'Identifier' && localFnUsesParam.has(callee.name)) {
        if (localFnUsesParam.get(callee.name)) {
          found = true;
          return traverse.SKIP;
        }
      }
    }
  });

  return found;
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Encourage `apiClient` fixture usage in API tests.',
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

        // Skip reporting if there is an eslint-disable comment for this rule
        const sourceCode = context.getSourceCode();
        const comments = sourceCode.getCommentsBefore(node);
        if (
          comments.some((c) =>
            /eslint-disable-next-line\s+@kbn\/eslint\/scout_require_api_client_in_api_test/.test(
              c.value
            )
          )
        ) {
          return;
        }

        if (!functionUsesApiClient(callbackArg, context)) {
          context.report({
            node,
            message: ERROR_MSG,
          });
        }
      },
    };
  },
};
