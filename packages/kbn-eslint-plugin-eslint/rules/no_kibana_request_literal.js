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

const ERROR_MSG =
  'Do not hand-build a KibanaRequest: it skips the KibanaRequest constructor, so fields such as `spaceId` are left unset. Use `kibanaRequestFactory` from "@kbn/core-http-server-utils", or `ML_INTERNAL_USER_REQUEST` from "@kbn/ml-plugin/server" to call ML services as the internal user.';

const REQUEST_TYPE_NAMES = new Set(['KibanaRequest', 'CoreKibanaRequest']);

/**
 * @param {Node | undefined} typeNode
 * @returns {boolean}
 */
const isKibanaRequestType = (typeNode) => {
  if (!typeNode || typeNode.type !== esTypes.TSTypeReference) {
    return false;
  }
  const { typeName } = typeNode;
  const name = typeName.type === esTypes.TSQualifiedName ? typeName.right.name : typeName.name;
  return REQUEST_TYPE_NAMES.has(name);
};

/**
 * @param {Node} node
 * @returns {boolean}
 */
const isObjectCreateCall = (node) =>
  node.type === esTypes.CallExpression &&
  node.callee.type === esTypes.MemberExpression &&
  node.callee.object.type === esTypes.Identifier &&
  node.callee.object.name === 'Object' &&
  node.callee.property.type === esTypes.Identifier &&
  node.callee.property.name === 'create';

/**
 * Unwraps intermediate casts, e.g. the `{} as unknown` part of `{} as unknown as KibanaRequest`.
 * @param {Node} node
 * @returns {Node}
 */
const unwrapCasts = (node) =>
  node.type === esTypes.TSAsExpression || node.type === esTypes.TSTypeAssertion
    ? unwrapCasts(node.expression)
    : node;

/**
 * @param {Node} node
 * @returns {boolean}
 */
const isHandBuiltObject = (node) => {
  const expression = unwrapCasts(node);
  return expression.type === esTypes.ObjectExpression || isObjectCreateCall(expression);
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    schema: [],
  },
  createOnce: (context) => {
    const reportCast = (node) => {
      if (isKibanaRequestType(node.typeAnnotation) && isHandBuiltObject(node.expression)) {
        context.report({ message: ERROR_MSG, loc: node.loc });
      }
    };

    return {
      TSAsExpression: reportCast,
      TSTypeAssertion: reportCast,
      VariableDeclarator(node) {
        if (
          node.init &&
          isObjectCreateCall(node.init) &&
          isKibanaRequestType(node.id.typeAnnotation?.typeAnnotation)
        ) {
          context.report({ message: ERROR_MSG, loc: node.loc });
        }
      },
    };
  },
};
