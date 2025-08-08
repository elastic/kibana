/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as TypescriptEsTree from '@typescript-eslint/typescript-estree';

export function getDefaultMessageFromI18n(
  i18nNode: TypescriptEsTree.TSESTree.JSXExpression
): string {
  const expression =
    i18nNode?.expression.type === TypescriptEsTree.TSESTree.AST_NODE_TYPES.CallExpression
      ? i18nNode.expression
      : undefined;

  if (
    !expression ||
    expression.callee.type !== TypescriptEsTree.TSESTree.AST_NODE_TYPES.MemberExpression
  ) {
    return '';
  }

  const opts = expression.arguments?.find(
    (arg) => arg.type === TypescriptEsTree.TSESTree.AST_NODE_TYPES.ObjectExpression
  );

  if (opts?.type !== TypescriptEsTree.TSESTree.AST_NODE_TYPES.ObjectExpression) {
    return '';
  }

  const defaultMessageArg = opts.properties.find(
    (prop) =>
      prop.type === TypescriptEsTree.TSESTree.AST_NODE_TYPES.Property &&
      prop.key.type === TypescriptEsTree.TSESTree.AST_NODE_TYPES.Identifier &&
      prop.key.name === 'defaultMessage'
  );

  return defaultMessageArg?.type === TypescriptEsTree.TSESTree.AST_NODE_TYPES.Property &&
    defaultMessageArg?.value?.type === TypescriptEsTree.TSESTree.AST_NODE_TYPES.Literal
    ? String(defaultMessageArg.value.value)
    : '';
}
