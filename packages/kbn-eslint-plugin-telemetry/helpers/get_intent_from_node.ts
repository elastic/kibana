/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TSESTree } from '@typescript-eslint/typescript-estree';
import camelCase from 'lodash/camelCase';

/*
    Attempts to get a string representation of the intent
    out of an array of nodes.
    
    Currently supported node types in the array:
    * String literal text (JSXText)
    * Translated text via <FormattedMessage> component -> uses prop `defaultMessage`
    * Translated text via {i18n.translate} call -> uses passed options object key `defaultMessage` 
*/
export function getIntentFromNode(originalNode: TSESTree.JSXOpeningElement): string {
  const parent = originalNode.parent as TSESTree.JSXElement;

  const node = Array.isArray(parent.children) ? parent.children : [];

  if (node.length === 0) {
    return '';
  }

  /*
    In order to satisfy TS we need to do quite a bit of defensive programming.
    This is my best attempt at providing the minimum amount of typeguards and
    keeping the code readable. In the cases where types are explicitly set to
    variables, it was done to help the compiler when it couldn't infer the type.
    */
  return node.reduce((acc: string, currentNode) => {
    switch (currentNode.type) {
      case 'JSXText':
        // When node is a string primitive
        return `${acc}${strip(currentNode.value)}`;

      case 'JSXElement':
        // Determining whether node is of form `<FormattedMessage defaultMessage="message" />`
        const name: TSESTree.JSXTagNameExpression = currentNode.openingElement.name;
        const attributes: Array<TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute> =
          currentNode.openingElement.attributes;

        if (!('name' in name) || name.name !== 'FormattedMessage') {
          return '';
        }

        const defaultMessageProp = attributes.find(
          (attribute) => 'name' in attribute && attribute.name.name === 'defaultMessage'
        );

        if (
          !defaultMessageProp ||
          !('value' in defaultMessageProp) ||
          !('type' in defaultMessageProp.value!) ||
          defaultMessageProp.value.type !== 'Literal' ||
          typeof defaultMessageProp.value.value !== 'string'
        ) {
          return '';
        }

        return `${acc}${strip(defaultMessageProp.value.value)}`;

      case 'JSXExpressionContainer':
        // Determining whether node is of form `{i18n.translate('foo', { defaultMessage: 'message'})}`
        const expression: TSESTree.JSXEmptyExpression | TSESTree.Expression =
          currentNode.expression;

        if (!('arguments' in expression)) {
          return '';
        }

        const args: TSESTree.CallExpressionArgument[] = expression.arguments;
        const callee: TSESTree.LeftHandSideExpression = expression.callee;

        if (!('object' in callee)) {
          return '';
        }

        const object: TSESTree.Expression = callee.object;
        const property: TSESTree.Expression | TSESTree.PrivateIdentifier = callee.property;

        if (!('name' in object) || !('name' in property)) {
          return '';
        }

        if (object.name !== 'i18n' || property.name !== 'translate') {
          return '';
        }

        const callExpressionArgument: TSESTree.CallExpressionArgument | undefined = args.find(
          (arg) => arg.type === 'ObjectExpression'
        );

        if (!callExpressionArgument || callExpressionArgument.type !== 'ObjectExpression') {
          return '';
        }

        const defaultMessageValue: TSESTree.ObjectLiteralElement | undefined =
          callExpressionArgument.properties.find(
            (prop) =>
              prop.type === 'Property' && 'name' in prop.key && prop.key.name === 'defaultMessage'
          );

        if (
          !defaultMessageValue ||
          !('value' in defaultMessageValue) ||
          defaultMessageValue.value.type !== 'Literal' ||
          typeof defaultMessageValue.value.value !== 'string'
        ) {
          return '';
        }

        return `${acc}${strip(defaultMessageValue.value.value)}`;

      default:
        break;
    }

    return acc;
  }, '');
}

function strip(input: string): string {
  if (!input) return '';

  const cleanedString = camelCase(input);

  return `${cleanedString.charAt(0).toUpperCase()}${cleanedString.slice(1)}`;
}
