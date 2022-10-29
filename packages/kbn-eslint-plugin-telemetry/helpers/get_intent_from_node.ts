/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

function strip(input: string): string {
  if (!input) return '';

  return input
    .toLowerCase()
    .trim()
    .replaceAll(' ', '-')
    .replaceAll('(', '')
    .replaceAll(')', '')
    .replaceAll('{', '')
    .replaceAll('}', '')
    .replaceAll('?', '');
}

/*
    Attempts to retrieve a textual representation of elements
    out of an array of AST nodes.
    
    It currently only works through the array of nodes that
    it has been passed. It does not traverse the AST tree
    further down.

    It currently supports:
        - flat text (JSXText)
        - translated text via <FormattedMessage> component -> uses `defaultMessage`
        - translated text via {i18n.translate} call -> uses `defaultMessage` 
*/
export function getIntentFromNodeArray(node: any): string {
  if (node.length === 0) return '';

  return node.reduce((acc: string, currentNode: any) => {
    switch (currentNode.type) {
      case 'JSXText':
        return `${acc}${strip(currentNode.value)}`;

      case 'JSXElement':
        const {
          openingElement: { name, attributes },
        } = currentNode;

        if (name.name === 'FormattedMessage') {
          const { value } = attributes.find((attrib: any) => attrib.name.name === 'defaultMessage');

          return `${acc}${strip(value.value)}`;
        }
        return acc;

      case 'JSXExpressionContainer':
        const {
          expression: {
            arguments: args,
            callee: { object, property },
          },
        } = currentNode;

        if (object.name === 'i18n' && property.name === 'translate') {
          const { properties } = args.find((arg: any) => arg.type === 'ObjectExpression');

          const { value } = properties.find(
            (prop: any) => prop.type === 'Property' && prop.key.name === 'defaultMessage'
          );

          return `${acc}${strip(value.value)}`;
        }
        return acc;

      default:
        break;
    }

    return acc;
  }, '');
}
