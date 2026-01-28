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
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Node} Node */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.CallExpression} CallExpression */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.ObjectExpression} ObjectExpression */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Property} Property */

const ERROR_MSG =
  'Avoid wrapping errors in logger meta. Use { error } instead of { error: { message: error } } to prevent error details from being swallowed.';

const LOGGER_METHODS = ['error', 'warn', 'fatal'];

/**
 * Checks if a property is the "error" key with an object value containing a "message" property
 * that holds a variable/expression (the problematic pattern)
 * @param {Property} property
 * @returns {boolean}
 */
const isWrappedErrorPattern = (property) => {
  // Check if this is error: { ... }
  if (
    property.type !== esTypes.Property ||
    property.key.type !== esTypes.Identifier ||
    property.key.name !== 'error' ||
    property.value.type !== esTypes.ObjectExpression
  ) {
    return false;
  }

  const objectValue = /** @type {ObjectExpression} */ (property.value);

  // Check if the nested object contains a 'message' property with an identifier or expression
  return objectValue.properties.some((nestedProp) => {
    if (nestedProp.type !== esTypes.Property) {
      return false;
    }

    const key = nestedProp.key;
    const keyName = key.type === esTypes.Identifier ? key.name : null;

    if (keyName !== 'message') {
      return false;
    }

    // The problematic pattern is when 'message' value is an identifier (variable) or expression
    // e.g., { error: { message: error } } or { error: { message: e.message } }
    const valueType = nestedProp.value.type;
    return (
      valueType === esTypes.Identifier ||
      valueType === esTypes.MemberExpression ||
      valueType === esTypes.CallExpression
    );
  });
};

/**
 * @param {CallExpression} node
 * @returns {boolean}
 */
const isLoggerCall = (node) => {
  if (
    node.callee.type !== esTypes.MemberExpression ||
    node.callee.property.type !== esTypes.Identifier
  ) {
    return false;
  }

  const methodName = node.callee.property.name;
  return LOGGER_METHODS.includes(methodName);
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow wrapping errors in logger metadata which causes error details to be swallowed',
    },
    fixable: 'code',
    schema: [],
  },
  create: (context) => ({
    CallExpression(_) {
      const node = /** @type {CallExpression} */ (_);

      // Check if this is a logger method call with at least 2 arguments
      if (!isLoggerCall(node) || node.arguments.length < 2) {
        return;
      }

      const metaArg = node.arguments[1];

      // Check if second argument is an object literal
      if (metaArg.type !== esTypes.ObjectExpression) {
        return;
      }

      const objectExpr = /** @type {ObjectExpression} */ (metaArg);

      for (const prop of objectExpr.properties) {
        if (prop.type === esTypes.Property && isWrappedErrorPattern(prop)) {
          // Find the message property to get the actual error variable
          const objectValue = /** @type {ObjectExpression} */ (prop.value);
          const messageProp = objectValue.properties.find(
            (p) =>
              p.type === esTypes.Property &&
              p.key.type === esTypes.Identifier &&
              p.key.name === 'message'
          );

          context.report({
            node: prop,
            message: ERROR_MSG,
            fix: (fixer) => {
              if (messageProp && messageProp.type === esTypes.Property) {
                const sourceCode = context.getSourceCode();
                const errorVarText = sourceCode.getText(messageProp.value);
                return fixer.replaceText(prop, `error: ${errorVarText}`);
              }
              return null;
            },
          });
        }
      }
    },
  }),
};
