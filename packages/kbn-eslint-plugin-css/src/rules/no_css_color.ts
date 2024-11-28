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
 * @description Regex to match css color values when used in a template string declarations,
 * see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value} for  definitions of valid css color values
 */
const cssColorRegex = /(#|rgb|hsl|hwb|lab|lch|oklab).*/;

/**
 * @description List of css properties that can that can apply color to html box element and text node
 */
const propertiesSupportingCssColor = ['color', 'background', 'backgroundColor', 'borderColor'];

/**
 * @description Builds off the existing color definition regex to match css declarations that can apply color to
 * html elements and text nodes for string declarations
 */
const htmlElementColorDeclarationRegex = RegExp(
  String.raw`(${propertiesSupportingCssColor.join('|')})\:\s?(\'|\")?${cssColorRegex.source}`
);

const raiseReportIfPropertyHasInvalidCssColor = (
  context: Rule.RuleContext,
  propertyNode: TSESTree.Property,
  messageToReport: Rule.ReportDescriptor
) => {
  let didReport: boolean;

  if (
    propertyNode.key.type === 'Identifier' &&
    propertiesSupportingCssColor.indexOf(propertyNode.key.name) < 0
  ) {
    return;
  }

  if ((didReport = Boolean(propertyNode.value.type === 'Literal'))) {
    // in trying to keep this rule simple, if a string is used to define a color we simply mark it as invalid
    context.report(messageToReport);
  } else if (propertyNode.value.type === 'Identifier') {
    const identifierDeclaration = context.sourceCode
      // @ts-expect-error
      .getScope(propertyNode)
      .variables.find(
        (variable) => variable.name === (propertyNode.value as TSESTree.Identifier).name!
      );

    if (identifierDeclaration?.defs[0].node.init.type === 'Literal') {
      context.report({
        loc: propertyNode.value.loc,
        messageId: 'noCSSColorSpecificDeclaredVariable',
        data: {
          // @ts-expect-error the key name is always present else this code will not execute
          property: String(propertyNode.key.name),
          line: String(propertyNode.value.loc.start.line),
          variableName: propertyNode.value.name,
        },
      });

      didReport = true;
    }

    return;
  } else if ((didReport = Boolean(propertyNode.value.type === 'MemberExpression'))) {
    // TODO: handle member expression ie. style.color.red
  }

  return didReport;
};

/**
 *
 * @description style object declaration have a depth of 1, this function handles the properties of the object
 */
const handleObjectProperties = (
  context: Rule.RuleContext,
  propertyParentNode: TSESTree.JSXAttribute,
  property: TSESTree.ObjectLiteralElement,
  reportMessage: Rule.ReportDescriptor
) => {
  if (property.type === 'Property') {
    raiseReportIfPropertyHasInvalidCssColor(context, property, reportMessage);
  } else if (property.type === 'SpreadElement') {
    const spreadElementIdentifierName = (property.argument as TSESTree.Identifier).name;

    const spreadElementDeclaration = context.sourceCode
      // @ts-expect-error
      .getScope(propertyParentNode!.value.expression!)
      .variables.find((variable) => variable.name === spreadElementIdentifierName);

    if (!spreadElementDeclaration) {
      return;
    }

    reportMessage = {
      loc: propertyParentNode.loc,
      messageId: 'noCSSColorSpecificDeclaredVariable',
      data: {
        // @ts-expect-error the key name is always present else this code will not execute
        property: String(property.argument.name),
        variableName: spreadElementIdentifierName,
        line: String(property.loc.start.line),
      },
    };

    (spreadElementDeclaration.defs[0].node.init as TSESTree.ObjectExpression).properties.forEach(
      (spreadProperty) => {
        handleObjectProperties(context, propertyParentNode, spreadProperty, reportMessage);
      }
    );
  }
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
              handleObjectProperties(context, node, property, {
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

            // assuming there's only one definition of the variable, eslint would catch other occurrences of this
            (
              styleVariableDeclaration.defs[0].node.init as TSESTree.ObjectExpression
            )?.properties.forEach((property) => {
              handleObjectProperties(context, node, property, {
                loc: node.loc,
                messageId: 'noCSSColorSpecificDeclaredVariable',
                data: {
                  property:
                    property.type === 'SpreadElement'
                      ? // @ts-expect-error the key name is always present else this code will not execute
                        String(property.argument.name)
                      : // @ts-expect-error the key name is always present else this code will not execute
                        String(property.key.name),
                  variableName: styleVariableName,
                  line: String(property.loc.start.line),
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
              handleObjectProperties(context, node, property, {
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
              handleObjectProperties(context, node, property, {
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
