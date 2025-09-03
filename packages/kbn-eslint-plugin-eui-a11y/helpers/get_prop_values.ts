/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as EsLint from 'eslint';
import * as TypescriptEsTree from '@typescript-eslint/typescript-estree';

export function getPropValues({
  jsxOpeningElement,
  propNames,
  sourceCode,
}: {
  jsxOpeningElement: TypescriptEsTree.TSESTree.JSXOpeningElement;
  propNames: string[];
  sourceCode: EsLint.SourceCode;
}): Record<
  (typeof propNames)[number],
  TypescriptEsTree.TSESTree.Literal | TypescriptEsTree.TSESTree.JSXExpressionContainer
> {
  const scope = sourceCode.getScope(jsxOpeningElement as any);

  if (!scope) return {};

  // Loop over the input propNames array
  return propNames.reduce((acc, propName) => {
    // Loop over the attributes of the input JSXOpeningElement
    for (const prop of jsxOpeningElement.attributes) {
      if (
        prop.type === TypescriptEsTree.AST_NODE_TYPES.JSXAttribute &&
        propName === prop.name.name &&
        prop.value &&
        (prop.value.type === TypescriptEsTree.AST_NODE_TYPES.Literal ||
          prop.value.type === TypescriptEsTree.AST_NODE_TYPES.JSXExpressionContainer)
      ) {
        acc[propName] = prop.value; // can be a string or an function
      }

      // If the prop is a JSXSpreadAttribute, get the value of the spreaded variable
      if (prop.type === TypescriptEsTree.AST_NODE_TYPES.JSXSpreadAttribute) {
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
        const variable = scope.variables.find((v) => v.name === name);

        // Get the value of the propName from the spreaded variable
        const value =
          variable && variable.defs.length > 0
            ? variable.defs[0].node.init?.properties?.find(
                (property: TypescriptEsTree.TSESTree.Property) => {
                  if ('value' in property.key && property.key.value) {
                    return property.key.value;
                  }
                  return undefined;
                }
              )
            : undefined;

        if (value) {
          acc[propName] = value;
        }
      }
    }
    return acc;
  }, {} as Record<(typeof propNames)[number], TypescriptEsTree.TSESTree.Literal | TypescriptEsTree.TSESTree.JSXExpressionContainer>);
}
