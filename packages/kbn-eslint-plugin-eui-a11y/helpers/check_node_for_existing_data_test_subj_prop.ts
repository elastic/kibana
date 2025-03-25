/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Scope } from 'eslint';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';

const PROP_NAMES = ['aria-label', 'aria-labelledby'];

export function checkNodeForExistingAriaLabelProp(
  node: TSESTree.JSXOpeningElement,
  getScope: () => Scope.Scope
): boolean {
  const hasProp = node.attributes.find(
    (attr) =>
      attr.type === AST_NODE_TYPES.JSXAttribute && PROP_NAMES.includes(String(attr.name.name))
  );

  if (hasProp) {
    return true;
  }

  const spreadedVariable = node.attributes.find(
    (attr) => attr.type === AST_NODE_TYPES.JSXSpreadAttribute
  );

  if (
    !spreadedVariable ||
    !('argument' in spreadedVariable) ||
    !('name' in spreadedVariable.argument)
  ) {
    return false;
  }

  const { name } = spreadedVariable.argument; // The name of the spreaded variable

  const variable = getScope().variables.find((v) => v.name === name); // the variable definition of the spreaded variable

  return variable && variable.defs.length > 0
    ? variable.defs[0].node.init?.properties?.find((property: TSESTree.Property) => {
        if ('value' in property.key) {
          return PROP_NAMES.includes(String(property.key.value));
        }
        return false;
      })
    : false;
}
