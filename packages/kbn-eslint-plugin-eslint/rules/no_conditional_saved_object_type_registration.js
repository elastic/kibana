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

const ERROR_MESSAGE =
  'Saved object type registration must be unconditional. Move savedObjects.registerType() outside conditional control flow to avoid migration ON/OFF conflicts.';

/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.CallExpression} CallExpression */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.MemberExpression} MemberExpression */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Node} Node */

/**
 * @param {Node} node
 */
const isConditionalNode = (node) => {
  return (
    node.type === esTypes.IfStatement ||
    node.type === esTypes.SwitchCase ||
    node.type === esTypes.ConditionalExpression ||
    node.type === esTypes.ForStatement ||
    node.type === esTypes.ForInStatement ||
    node.type === esTypes.ForOfStatement ||
    node.type === esTypes.WhileStatement ||
    node.type === esTypes.DoWhileStatement
  );
};

/**
 * @param {Node} node
 */
const isSavedObjectsObject = (node) => {
  if (node.type === esTypes.Identifier) {
    return node.name === 'savedObjects';
  }

  if (node.type === esTypes.MemberExpression && !node.computed) {
    return node.property.type === esTypes.Identifier && node.property.name === 'savedObjects';
  }

  return false;
};

/**
 * @param {CallExpression} node
 */
const isSavedObjectsRegisterTypeCall = (node) => {
  if (node.callee.type !== esTypes.MemberExpression || node.callee.computed) {
    return false;
  }

  const callee = /** @type {MemberExpression} */ (node.callee);
  return (
    callee.property.type === esTypes.Identifier &&
    callee.property.name === 'registerType' &&
    isSavedObjectsObject(callee.object)
  );
};

/**
 * @param {CallExpression} node
 * @param {Node[]} ancestors
 */
const isConditionallyExecuted = (node, ancestors) => {
  let currentNode = node;
  for (let index = ancestors.length - 1; index >= 0; index--) {
    const ancestor = ancestors[index];
    if (isConditionalNode(ancestor)) {
      return true;
    }

    if (
      ancestor.type === esTypes.LogicalExpression &&
      ancestor.right === currentNode &&
      (ancestor.operator === '&&' || ancestor.operator === '||' || ancestor.operator === '??')
    ) {
      return true;
    }
    currentNode = ancestor;
  }

  return false;
};

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow conditional saved objects type registration',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.getSourceCode();

    return {
      CallExpression(_) {
        const node = /** @type {CallExpression} */ (_);
        if (!isSavedObjectsRegisterTypeCall(node)) {
          return;
        }

        const ancestors = sourceCode.getAncestors(node);
        if (!isConditionallyExecuted(node, ancestors)) {
          return;
        }

        context.report({
          node,
          message: ERROR_MESSAGE,
        });
      },
    };
  },
};
