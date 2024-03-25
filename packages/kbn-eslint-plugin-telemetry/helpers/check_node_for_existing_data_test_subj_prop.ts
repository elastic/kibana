/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Scope } from 'eslint';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';

export function checkNodeForExistingDataTestSubjProp(
  node: TSESTree.JSXOpeningElement,
  getScope: () => Scope.Scope
): boolean {
  const hasJsxDataTestSubjProp = node.attributes.find(
    (attr) => attr.type === AST_NODE_TYPES.JSXAttribute && attr.name.name === 'data-test-subj'
  );

  if (hasJsxDataTestSubjProp) {
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
          return property.key.value === 'data-test-subj';
        }
        return false;
      })
    : false;
}
