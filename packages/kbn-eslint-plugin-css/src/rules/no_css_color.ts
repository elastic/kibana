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

/**
 * @description Regex to match css color values,
 * see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value} for  definitions of valid css color values
 */
const cssColorRegex = /(#|rgb|hsl|hwb|lab|lch|oklab).*/;

/**
 * @description List of css properties that can that can apply color to html box element and text node
 */
const propertiesSupportingCssColor = ['color', 'background', 'backgroundColor', 'border'];

/**
 * @description Builds off the existing color definition regex to match css declarations that can apply color to html elements and text nodes
 */
const htmlElementColorDeclarationRegex = RegExp(
  String.raw`(${propertiesSupportingCssColor.join('|')})\:\s?(\'|\")?${cssColorRegex.source}`
);

const raiseReportIfPropertyHasCssColor = (
  context: Rule.RuleContext,
  node: TSESTree.ObjectLiteralElement
) => {
  let didReport: boolean;

  // checks if property value is a css color value for instances where style declaration is computed from an object
  if (
    (didReport = Boolean(
      node.type === 'Property' &&
        node.key.type === 'Identifier' &&
        node.value.type === 'Literal' &&
        propertiesSupportingCssColor.indexOf(node.key.name) > -1 &&
        cssColorRegex.test(String(node.value.value) ?? '')
    ))
  ) {
    context.report({
      loc: node.loc,
      messageId: 'noCssColor',
    });
  }

  return didReport;
};

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
           * @example <EuiCode style={`{ color: '#dd4040' }`}>This is an example</EuiCode>
           */
          if (
            node.value &&
            node.value.type === 'JSXExpressionContainer' &&
            node.value.expression.type === 'TemplateLiteral'
          ) {
            const declarationTemplateNode = node.value.expression.quasis[0];

            if (htmlElementColorDeclarationRegex.test(declarationTemplateNode.value.raw)) {
              context.report({
                node: declarationTemplateNode,
                messageId: 'noCssColor',
              });
            }
          }

          /**
           * @example <EuiCode style={{ color: '#dd4040' }}>This is an example</EuiCode>
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

              if (raiseReportIfPropertyHasCssColor(context, property)) {
                break;
              }
            }
          }
        }

        if (node.name.name === 'css') {
          /**
           * @example <EuiCode css={`{ color: '#dd4040' }`}>This is an example</EuiCode>
           */
          if (
            node.value &&
            node.value.type === 'JSXExpressionContainer' &&
            node.value.expression.type === 'TemplateLiteral'
          ) {
            const declarationTemplateNode = node.value.expression.quasis[0];

            if (htmlElementColorDeclarationRegex.test(declarationTemplateNode.value.raw)) {
              context.report({
                node: declarationTemplateNode,
                messageId: 'noCssColor',
              });
            }
          }

          /**
           * @example <EuiCode css={{ color: '#dd4040' }}>This is an example</EuiCode>
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

              if (raiseReportIfPropertyHasCssColor(context, property)) {
                break;
              }
            }
          }

          /**
           * @example <EuiCode css={css`{ color: #dd4040 }`}>This is an example</EuiCode>
           */
          if (
            node.value &&
            node.value.type === 'JSXExpressionContainer' &&
            node.value.expression.type === 'TaggedTemplateExpression' &&
            node.value.expression.tag.type === 'Identifier' &&
            node.value.expression.tag.name === 'css'
          ) {
            const declarationTemplateNode = node.value.expression.quasi.quasis[0];

            if (htmlElementColorDeclarationRegex.test(declarationTemplateNode.value.raw)) {
              context.report({
                node: declarationTemplateNode,
                messageId: 'noCssColor',
              });
            }
          }

          /**
           * @example <EuiCode css={() => ({ color: '#dd4040' })}>This is an example</EuiCode>
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

              if (raiseReportIfPropertyHasCssColor(context, property)) {
                break;
              }
            }
          }
        }
      },
    };
  },
};
