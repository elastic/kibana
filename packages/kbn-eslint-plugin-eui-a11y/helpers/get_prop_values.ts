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

export function getPropValues({
  propNames,
  node,
  getScope,
}: {
  propNames: string[];
  node: TSESTree.JSXOpeningElement;
  getScope: () => Scope.Scope;
}): Record<(typeof propNames)[number], string> {
  // Loop over the input propNames array
  const result = propNames.reduce((acc, propName) => {
    // Loop over the attributes of the input JSXOpeningElement
    for (const prop of node.attributes) {
      // If the prop is an JSXAttribute and the name of the prop is equal to the propName, get the value
      if (prop.type === AST_NODE_TYPES.JSXAttribute && propName === prop.name.name) {
        const value = String('value' in prop && 'value' in prop.value! && prop.value.value) || '';
        acc[propName] = value;
      }

      // If the prop is a JSXSpreadAttribute, get the value of the spreaded variable
      if (prop.type === AST_NODE_TYPES.JSXSpreadAttribute) {
        // If the spreaded variable is an Expression, break
        if (!('argument' in prop) || !('name' in prop.argument)) {
          break;
        }

        // The name of the variable which is spreaded on the node
        // i.e.
        // const args = { foo: 'bar' };
        // <Foo {...args} />
        const { name } = prop.argument;

        // the variable definition of the spreaded variable
        const variable = getScope().variables.find((v) => v.name === name);

        // Get the value of the propName from the spreaded variable
        const value: string | undefined =
          variable && variable.defs.length > 0
            ? variable.defs[0].node.init?.properties?.find((property: TSESTree.Property) => {
                if ('value' in property.key) {
                  return propNames.includes(String(property.key.value));
                }
                return undefined;
              })
            : undefined;

        if (value) {
          acc[propName] = value;
        }
      }
    }
    return acc;
  }, {} as Record<(typeof propNames)[number], string>);

  return result;
}
