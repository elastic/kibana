/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Scope } from 'eslint';
import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';

const EBT_REQUIRED_ATTRS = ['data-ebt-action', 'data-ebt-element'];

/**
 * Returns true if a spread attribute is a call to `getEbtProps(...)`.
 */
const isGetEbtPropsCall = (spread: TSESTree.JSXSpreadAttribute): boolean => {
  const { argument } = spread;
  if (argument.type !== AST_NODE_TYPES.CallExpression) {
    return false;
  }
  const { callee } = argument;
  return callee.type === AST_NODE_TYPES.Identifier && callee.name === 'getEbtProps';
};

/**
 * Returns true if a spread attribute is a variable whose initializer
 * contains all the required EBT property keys.
 */
const findVariable = (scope: Scope.Scope, name: string): Scope.Variable | undefined => {
  let current: Scope.Scope | null = scope;
  while (current) {
    const found = current.variables.find((v) => v.name === name);
    if (found) return found;
    current = current.upper;
  }
  return undefined;
};

const isVariableWithEbtProps = (
  spread: TSESTree.JSXSpreadAttribute,
  getScope: () => Scope.Scope
): boolean => {
  const { argument } = spread;
  if (!('name' in argument)) {
    return false;
  }

  const variable = findVariable(getScope(), argument.name as string);
  if (!variable || variable.defs.length === 0) {
    return false;
  }

  const properties = variable.defs[0].node.init?.properties;
  if (!properties) {
    return false;
  }

  return EBT_REQUIRED_ATTRS.every((attr) =>
    properties.some(
      (prop: TSESTree.ObjectLiteralElement) =>
        prop.type === AST_NODE_TYPES.Property && 'value' in prop.key && prop.key.value === attr
    )
  );
};

/**
 * Returns true if the JSXOpeningElement already has EBT tracking attributes
 * (`data-ebt-action` and `data-ebt-element`), either as direct attributes or
 * via a `{...getEbtProps({...})}` spread.
 */
export const checkNodeForExistingEbtProps = (
  node: TSESTree.JSXOpeningElement,
  getScope: () => Scope.Scope
): boolean => {
  // Check direct JSX attributes first.
  const attrNames = node.attributes
    .filter(
      (attr): attr is TSESTree.JSXAttribute =>
        attr.type === AST_NODE_TYPES.JSXAttribute && attr.name.type === AST_NODE_TYPES.JSXIdentifier
    )
    .map((attr) => (attr.name as TSESTree.JSXIdentifier).name);

  if (EBT_REQUIRED_ATTRS.every((name) => attrNames.includes(name))) {
    return true;
  }

  // Check spread attributes for getEbtProps() calls or variables with EBT keys.
  const spreads = node.attributes.filter(
    (attr): attr is TSESTree.JSXSpreadAttribute => attr.type === AST_NODE_TYPES.JSXSpreadAttribute
  );

  return spreads.some(
    (spread) => isGetEbtPropsCall(spread) || isVariableWithEbtProps(spread, getScope)
  );
};
