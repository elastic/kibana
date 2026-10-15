/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Scope } from '@oxlint/plugins';
import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';

export function checkNodeForExistingDataTestSubjProp(
  node: TSESTree.JSXOpeningElement,
  getScope: () => Scope
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
  const definition = variable?.defs[0]?.node;

  if (definition?.type !== 'VariableDeclarator' || definition.init?.type !== 'ObjectExpression') {
    return false;
  }

  return definition.init.properties.some(
    (property) =>
      property.type === 'Property' &&
      'value' in property.key &&
      property.key.value === 'data-test-subj'
  );
}
