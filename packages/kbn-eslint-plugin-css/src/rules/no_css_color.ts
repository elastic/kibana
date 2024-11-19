/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/typescript-estree';

export const NoCssColor: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Use color definitions from eui theme as opposed to CSS color values',
      category: 'Best Practices',
      recommended: true,
      url: 'https://eui.elastic.co/#/theming/colors/values',
    },
    messages: {
      noCssColor: 'Avoid using CSS colors',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (!(node.name.name === 'style' || node.name.name === 'css')) {
          return;
        }

        if (node.name.name === 'style') {
          /**
           * @example <EuiCode style={`{ color: '#dd4040' }`}>This is a test</EuiCode>
           */
          if (
            node.value &&
            node.value.type === 'JSXExpressionContainer' &&
            node.value.expression.type === 'TemplateLiteral'
          ) {
            const declarationTemplateNode = node.value.expression.quasis[0];

            if (
              /color\:\s?(\'|\")?(#|rgb|hsl|hwb|lab|lch|oklab)/.test(
                declarationTemplateNode.value.raw
              )
            ) {
              context.report({
                node: declarationTemplateNode,
                messageId: 'noCssColor',
              });
            }
          }

          /**
           * @example <EuiCode style={{ color: '#dd4040' }}>This is a test</EuiCode>
           */
          if (
            node.value &&
            node.value.type === 'JSXExpressionContainer' &&
            node.value.expression.type === 'ObjectExpression'
          ) {
            const declarationTemplateNode = node.value.expression.properties;

            if (!declarationTemplateNode.length) {
              return;
            }

            for (let i = 0; i < declarationTemplateNode.length; i++) {
              const property = declarationTemplateNode[i];
              if (
                property.type === 'Property' &&
                property.key.type === 'Identifier' &&
                property.key.name === 'color' &&
                property.value.type === 'Literal' &&
                property.value.value &&
                /(#|rgb|hsl|hwb|lab|lch|oklab).*/.test(String(property.value.value))
              ) {
                context.report({
                  node: property.key,
                  messageId: 'noCssColor',
                });

                break;
              }
            }
          }
        }

        if (node.name.name === 'css') {
          /**
           * @example <EuiCode css={`{ color: '#dd4040' }`}>This is a test</EuiCode>
           */
          if (
            node.value &&
            node.value.type === 'JSXExpressionContainer' &&
            node.value.expression.type === 'TemplateLiteral'
          ) {
            const declarationTemplateNode = node.value.expression.quasis[0];

            if (
              /color\:\s?(\'|\")(#|rgb|hsl|hwb|lab|lch|oklab)/.test(
                declarationTemplateNode.value.raw
              )
            ) {
              context.report({
                node: declarationTemplateNode,
                messageId: 'noCssColor',
              });
            }
          }

          /**
           * @example <EuiCode css={{ color: '#dd4040' }}>This is a test</EuiCode>
           */
          if (
            node.value &&
            node.value.type === 'JSXExpressionContainer' &&
            node.value.expression.type === 'ObjectExpression'
          ) {
            const declarationTemplateNode = node.value.expression.properties;

            if (!declarationTemplateNode.length) {
              return;
            }

            for (let i = 0; i < declarationTemplateNode.length; i++) {
              const property = declarationTemplateNode[i];

              if (
                property.type === 'Property' &&
                property.key.type === 'Identifier' &&
                property.key.name === 'color' &&
                property.value.type === 'Literal' &&
                property.value.value &&
                /(#|rgb|hsl|hwb|lab|lch|oklab).*/.test(String(property.value.value))
              ) {
                context.report({
                  node: property.key,
                  messageId: 'noCssColor',
                });

                break;
              }
            }
          }

          /**
           * @example <EuiCode css={css`{ color: #dd4040 }`}>This is a test</EuiCode>
           */
          if (
            node.value &&
            node.value.type === 'JSXExpressionContainer' &&
            node.value.expression.type === 'TaggedTemplateExpression' &&
            node.value.expression.tag.type === 'Identifier' &&
            node.value.expression.tag.name === 'css'
          ) {
            const declarationTemplateNode = node.value.expression.quasi.quasis[0];

            if (
              /color\:\s?(\'|\")(#|rgb|hsl|hwb|lab|lch|oklab)/.test(
                declarationTemplateNode.value.raw
              )
            ) {
              context.report({
                node: declarationTemplateNode,
                messageId: 'noCssColor',
              });
            }
          }

          /**
           * @example <EuiCode css={() => ({ color: '#dd4040' })}>This is a test</EuiCode>
           */
          if (
            node.value &&
            node.value.type === 'JSXExpressionContainer' &&
            (node.value.expression.type === 'FunctionExpression' ||
              node.value.expression.type === 'ArrowFunctionExpression')
          ) {
            let declarationPropertiesNode: TSESTree.Property[] = [];

            if (node.value.expression.body.type === 'ObjectExpression') {
              // @ts-expect-error
              declarationPropertiesNode = node.value.expression.body.properties;
            }

            if (node.value.expression.body.type === 'BlockStatement') {
              const functionReturnStatementNode = node.value.expression.body.body?.find((_node) => {
                return _node.type === 'ReturnStatement';
              });

              if (!functionReturnStatementNode) {
                return;
              }

              declarationPropertiesNode = // @ts-expect-error
                (functionReturnStatementNode as TSESTree.ReturnStatement).argument?.properties;
            }

            if (!declarationPropertiesNode.length) {
              return;
            }

            for (let i = 0; i < declarationPropertiesNode.length; i++) {
              const property = declarationPropertiesNode[i];

              if (
                property.type === 'Property' &&
                property.key.type === 'Identifier' &&
                property.key.name === 'color' &&
                property.value.type === 'Literal' &&
                property.value.value &&
                /(#|rgb|hsl|hwb|lab|lch|oklab).*/.test(String(property.value.value))
              ) {
                context.report({
                  node: property.key,
                  messageId: 'noCssColor',
                });

                break;
              }
            }
          }
        }
      },
    };
  },
};
