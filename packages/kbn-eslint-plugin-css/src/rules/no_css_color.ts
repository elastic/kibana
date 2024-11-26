/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// import Color from 'color';
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
 * @description Builds off the existing color definition regex to match css declarations that can apply color to
 * html elements and text nodes for string declarations
 */
const htmlElementColorDeclarationRegex = RegExp(
  String.raw`(${propertiesSupportingCssColor.join('|')})\:\s?(\'|\")?${cssColorRegex.source}`
);

const raiseReportIfPropertyHasInvalidCssColor = (
  context: Rule.RuleContext,
  propertyNode: TSESTree.ObjectLiteralElement,
  messageToReport: Rule.ReportDescriptor
) => {
  let didReport: boolean;

  // checks if property value is a css color value for instances where style declaration is computed from an object
  if (
    (didReport = Boolean(
      propertyNode.type === 'Property' &&
        propertyNode.key.type === 'Identifier' &&
        propertyNode.value.type === 'Literal' &&
        propertiesSupportingCssColor.indexOf(propertyNode.key.name) > -1 &&
        cssColorRegex.test(String(propertyNode.value.value) ?? '')
    ))
  ) {
    context.report(messageToReport);
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
      noCSSColorSpecificDeclaredVariable:
        'Avoid using a literal CSS color value for "{{property}}", use an EUI theme color instead in declared variable {{variableName}} on line {{line}}',
      noCssColorSpecific:
        'Avoid using a literal CSS color value for "{{property}}", use an EUI theme color instead',
      noCssColor: 'Avoid using a literal CSS color value, use an EUI theme color instead',
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
           * @example <EuiCode style={{ color: '#dd4040' }}>This is an example</EuiCode>
           */
          if (
            node.value &&
            node.value.type === 'JSXExpressionContainer' &&
            node.value.expression.type === 'ObjectExpression'
          ) {
            const declarationPropertiesNode = node.value.expression.properties;

            declarationPropertiesNode?.forEach((property) => {
              raiseReportIfPropertyHasInvalidCssColor(context, property, {
                loc: property.loc,
                messageId: 'noCssColorSpecific',
                data: {
                  // @ts-expect-error the key name is always present else this code will not execute
                  property: property.key.name,
                },
              });
            });

            return;
          }

          /**
           * @example
           *
           * const codeStyle = { color: '#dd4040' };
           *
           * <EuiCode style={codeStyle}>This is an example</EuiCode>
           */
          if (
            node.value &&
            node.value.type === 'JSXExpressionContainer' &&
            node.value.expression.type === 'Identifier'
          ) {
            const styleVariableName = node.value.expression.name;

            const styleVariableDeclaration = context.sourceCode
              .getScope(node.value.expression)
              .variables.find((variable) => variable.name === styleVariableName);

            if (!styleVariableDeclaration) {
              return;
            }

            // assuming there's only one definition of the variable
            (
              styleVariableDeclaration.defs[0].node as TSESTree.VariableDeclarator
            ).init?.properties.forEach((property) => {
              raiseReportIfPropertyHasInvalidCssColor(context, property, {
                loc: node.loc,
                messageId: 'noCSSColorSpecificDeclaredVariable',
                data: {
                  property: property.key.name,
                  variableName: styleVariableName,
                  line: property.loc.start.line,
                },
              });
            });

            return;
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
            for (let i = 0; i < node.value.expression.quasis.length; i++) {
              const declarationTemplateNode = node.value.expression.quasis[i];

              if (htmlElementColorDeclarationRegex.test(declarationTemplateNode.value.raw)) {
                context.report({
                  node: declarationTemplateNode,
                  messageId: 'noCssColor',
                });

                break;
              }
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
            const declarationPropertiesNode = node.value.expression.properties;

            declarationPropertiesNode?.forEach((property) => {
              raiseReportIfPropertyHasInvalidCssColor(context, property, {
                loc: property.loc,
                messageId: 'noCssColorSpecific',
                data: {
                  // @ts-expect-error the key name is always present else this code will not execute
                  property: property.key.name,
                },
              });
            });

            return;
          }

          /**
           * @description check if css prop is a tagged template literal from emotion
           * @example <EuiCode css={css`{ color: #dd4040 }`}>This is an example</EuiCode>
           */
          if (
            node.value &&
            node.value.type === 'JSXExpressionContainer' &&
            node.value.expression.type === 'TaggedTemplateExpression' &&
            node.value.expression.tag.type === 'Identifier' &&
            node.value.expression.tag.name === 'css'
          ) {
            for (let i = 0; i < node.value.expression.quasi.quasis.length; i++) {
              const declarationTemplateNode = node.value.expression.quasi.quasis[i];

              if (htmlElementColorDeclarationRegex.test(declarationTemplateNode.value.raw)) {
                context.report({
                  loc: declarationTemplateNode.loc,
                  messageId: 'noCssColor',
                });

                break;
              }
            }

            return;
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

            declarationPropertiesNode.forEach((property) => {
              raiseReportIfPropertyHasInvalidCssColor(context, property, {
                loc: property.loc,
                messageId: 'noCssColorSpecific',
                data: {
                  // @ts-expect-error the key name is always present else this code will not execute
                  property: property.key.name,
                },
              });
            });

            return;
          }
        }
      },
    };
  },
};
