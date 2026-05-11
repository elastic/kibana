/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const traverse = require('eslint-traverse');

const ISSUE_URL = 'https://github.com/elastic/kibana/issues/265720';
const RAW_WRITE_METHODS = new Set(['update', 'replace', 'unset', 'updateGlobal']);
const PROPAGATION_METHOD = 'withPropagationDelay';

const FUNCTION_TYPES = new Set([
  'ArrowFunctionExpression',
  'FunctionDeclaration',
  'FunctionExpression',
]);

const getPropertyName = (node) => {
  if (node?.type === 'Identifier') {
    return node.name;
  }

  if (node?.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
};

const isFunctionNode = (node) => FUNCTION_TYPES.has(node?.type);

const isUiSettingsTarget = (node) => {
  if (!node) {
    return false;
  }

  if (node.type === 'Identifier') {
    return node.name === 'uiSettings';
  }

  return node.type === 'MemberExpression' && getPropertyName(node.property) === 'uiSettings';
};

const getUiSettingsMethodName = (node) => {
  const callee = node?.callee;

  if (!callee || callee.type !== 'MemberExpression' || !isUiSettingsTarget(callee.object)) {
    return;
  }

  return getPropertyName(callee.property);
};

const getEnclosingFunction = (node) => {
  let current = node.parent;

  while (current && !isFunctionNode(current)) {
    current = current.parent;
  }

  return current;
};

const hasLaterPropagationCall = (node, functionNode, context) => {
  let found = false;

  traverse(context, functionNode.body, (path) => {
    const currentNode = path.node;

    if (found) {
      return traverse.SKIP;
    }

    if (currentNode !== functionNode && isFunctionNode(currentNode)) {
      return traverse.SKIP;
    }

    if (
      currentNode.type === 'CallExpression' &&
      currentNode.range &&
      currentNode.range[0] > node.range[0] &&
      getUiSettingsMethodName(currentNode) === PROPAGATION_METHOD
    ) {
      found = true;
      return traverse.SKIP;
    }
  });

  return found;
};

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require uiSettings propagation handling after writes in multi-node deployment-agnostic tests.',
      category: 'Best Practices',
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const methodName = getUiSettingsMethodName(node);

        if (!methodName || !RAW_WRITE_METHODS.has(methodName)) {
          return;
        }

        const functionNode = getEnclosingFunction(node);

        if (!functionNode?.body || hasLaterPropagationCall(node, functionNode, context)) {
          return;
        }

        context.report({
          node,
          message:
            `Calls to uiSettings.${methodName}() in these tests must be followed in the same helper, hook, or test by uiSettings.withPropagationDelay(...). ` +
            `This guards dependent assertions against Kibana's multi-node uiSettings cache propagation window. See ${ISSUE_URL}.`,
        });
      },
    };
  },
};
