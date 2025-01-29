/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Rule } from 'eslint';
import { CSSStyleDeclaration } from 'cssstyle';
import type { TSESTree } from '@typescript-eslint/typescript-estree';

/**
 * @description List of superset css properties that can apply color to html box element elements and text nodes, leveraging the
 * css style package allows us to directly singly check for these properties even if the actual declaration was written using the shorthand form
 */
const propertiesSupportingCssColor = ['color', 'background', 'border'];

/**
 * @description Builds off the existing color definition to match css declarations that can apply color to
 * html elements and text nodes for string declarations
 */
const htmlElementColorDeclarationRegex = RegExp(
  String.raw`(${propertiesSupportingCssColor.join('|')})`
);

const checkPropertySpecifiesInvalidCSSColor = ([property, value]: string[]) => {
  if (!property || !value) return false;

  const style = new CSSStyleDeclaration();

  // @ts-ignore the types for this packages specifies an index signature of number, alongside other valid CSS properties
  style[property.trim()] = typeof value === 'string' ? value.trim() : value;

  const anchor = propertiesSupportingCssColor.find((resolvedProperty) =>
    property.includes(resolvedProperty)
  );

  if (!anchor) return false;

  // build the resolved color property to check if the value is a string after parsing the style declaration
  const resolvedColorProperty = anchor === 'color' ? 'color' : anchor + 'Color';

  // in trying to keep this rule simple, it's enough if we get a value back, because if it was an identifier we would have been able to set a value within this invocation
  // @ts-ignore the types for this packages specifics an index signature of number, alongside other valid CSS properties
  return Boolean(style[resolvedColorProperty]);
};

const resolveMemberExpressionRoot = (node: TSESTree.MemberExpression): TSESTree.Identifier => {
  if (node.object.type === 'MemberExpression') {
    return resolveMemberExpressionRoot(node.object);
  }

  return node.object as TSESTree.Identifier;
};

/**
 * @description method to inspect values of interest found on an object
 */
const raiseReportIfPropertyHasInvalidCssColor = (
  context: Rule.RuleContext,
  propertyNode: TSESTree.Property,
  messageToReport: Rule.ReportDescriptor
) => {
  let didReport = false;

  if (
    propertyNode.key.type === 'Identifier' &&
    !htmlElementColorDeclarationRegex.test(propertyNode.key.name)
  ) {
    return didReport;
  }

  if (propertyNode.value.type === 'Literal') {
    if (
      (didReport = checkPropertySpecifiesInvalidCSSColor([
        // @ts-expect-error the key name is present in this scenario
        propertyNode.key.name,
        propertyNode.value.value,
      ]))
    ) {
      context.report(messageToReport);
    }
  } else if (propertyNode.value.type === 'Identifier') {
    const identifierDeclaration = context.sourceCode
      // @ts-expect-error
      .getScope(propertyNode)
      .variables.find(
        (variable) => variable.name === (propertyNode.value as TSESTree.Identifier).name!
      );

    if (
      identifierDeclaration?.defs[0].node.init?.type === 'Literal' &&
      checkPropertySpecifiesInvalidCSSColor([
        // @ts-expect-error the key name is present in this scenario
        propertyNode.key.name,
        (identifierDeclaration.defs[0].node.init as TSESTree.Literal).value as string,
      ])
    ) {
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
  } else if (propertyNode.value.type === 'MemberExpression') {
    // @ts-expect-error we ignore the case where this node could be a private identifier
    const MemberExpressionLeafName = propertyNode.value.property.name;
    const memberExpressionRootName = resolveMemberExpressionRoot(propertyNode.value).name;

    const expressionRootDeclaration = context.sourceCode
      // @ts-expect-error
      .getScope(propertyNode)
      .variables.find((variable) => variable.name === memberExpressionRootName);

    const expressionRootDeclarationInit = expressionRootDeclaration?.defs[0].node.init;

    if (expressionRootDeclarationInit?.type === 'ObjectExpression') {
      (expressionRootDeclarationInit as TSESTree.ObjectExpression).properties.forEach(
        (property) => {
          // This is a naive approach expecting the value to be at depth 1, we should actually be traversing the object to the same depth as the expression
          if (
            property.type === 'Property' &&
            property.key.type === 'Identifier' &&
            property.key?.name === MemberExpressionLeafName
          ) {
            raiseReportIfPropertyHasInvalidCssColor(context, property, {
              loc: propertyNode.value.loc,
              messageId: 'noCSSColorSpecificDeclaredVariable',
              data: {
                // @ts-expect-error the key name is always present else this code will not execute
                property: String(propertyNode.key.name),
                line: String(propertyNode.value.loc.start.line),
                variableName: memberExpressionRootName,
              },
            });
          }
        }
      );
    } else if (expressionRootDeclarationInit?.type === 'CallExpression') {
      // TODO: if this object was returned from invoking a function the best we can do is probably validate that the method invoked is one that returns an euitheme object
    }
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
      .references.find((ref) => ref.identifier.name === spreadElementIdentifierName)?.resolved;

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

    const spreadElementDeclarationNode = spreadElementDeclaration.defs[0].node.init;

    // evaluate only statically defined declarations, other possibilities like callExpressions in this context complicate things
    if (spreadElementDeclarationNode?.type === 'ObjectExpression') {
      (spreadElementDeclarationNode as TSESTree.ObjectExpression).properties.forEach(
        (spreadProperty) => {
          handleObjectProperties(context, propertyParentNode, spreadProperty, reportMessage);
        }
      );
    }
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
      // accounts for instances where declarations are created using the template tagged css function
      TaggedTemplateExpression(node) {
        if (
          node.tag.type !== 'Identifier' ||
          (node.tag.type === 'Identifier' && node.tag.name !== 'css')
        ) {
          return;
        }

        for (let i = 0; i < node.quasi.quasis.length; i++) {
          const declarationTemplateNode = node.quasi.quasis[i];

          if (htmlElementColorDeclarationRegex.test(declarationTemplateNode.value.raw)) {
            const cssText = declarationTemplateNode.value.raw.replace(/(\{|\}|\\n)/g, '').trim();

            cssText.split(';').forEach((declaration) => {
              if (
                declaration.length > 0 &&
                checkPropertySpecifiesInvalidCSSColor(declaration.split(':'))
              ) {
                context.report({
                  node: declarationTemplateNode,
                  messageId: 'noCssColor',
                });
              }
            });
          }
        }
      },
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (!(node.name.name === 'style' || node.name.name === 'css')) {
          return;
        }

        /**
         * @description Accounts for instances where a variable is used to define a style object
         *
         * @example
         * const codeStyle = { color: '#dd4040' };
         * <EuiCode style={codeStyle}>This is an example</EuiCode>
         *
         * @example
         * const codeStyle = { color: '#dd4040' };
         * <EuiCode css={codeStyle}>This is an example</EuiCode>
         *
         * @example
         * const codeStyle = css({ color: '#dd4040' });
         * <EuiCode css={codeStyle}>This is an example</EuiCode>
         */
        if (
          node.value?.type === 'JSXExpressionContainer' &&
          node.value.expression.type === 'Identifier'
        ) {
          const styleVariableName = node.value.expression.name;

          const nodeScope = context.sourceCode.getScope(node.value.expression);

          const variableDeclarationMatches = nodeScope.references.find(
            (ref) => ref.identifier.name === styleVariableName
          )?.resolved;

          let variableInitializationNode;

          if ((variableInitializationNode = variableDeclarationMatches?.defs?.[0]?.node?.init)) {
            if (variableInitializationNode.type === 'ObjectExpression') {
              // @ts-ignore
              variableInitializationNode.properties.forEach((property) => {
                handleObjectProperties(context, node, property, {
                  loc: property.loc,
                  messageId: 'noCSSColorSpecificDeclaredVariable',
                  data: {
                    property:
                      property.type === 'SpreadElement'
                        ? String(property.argument.name)
                        : String(property.key.name),
                    variableName: styleVariableName,
                    line: String(property.loc.start.line),
                  },
                });
              });
            } else if (
              variableInitializationNode.type === 'CallExpression' &&
              variableInitializationNode.callee.name === 'css'
            ) {
              const cssFunctionArgument = variableInitializationNode.arguments[0];

              if (cssFunctionArgument.type === 'ObjectExpression') {
                // @ts-ignore
                cssFunctionArgument.properties.forEach((property) => {
                  handleObjectProperties(context, node, property, {
                    loc: node.loc,
                    messageId: 'noCSSColorSpecificDeclaredVariable',
                    data: {
                      property:
                        property.type === 'SpreadElement'
                          ? String(property.argument.name)
                          : String(property.key.name),
                      variableName: styleVariableName,
                      line: String(property.loc.start.line),
                    },
                  });
                });
              }
            }
          }

          return;
        }

        /**
         *
         * @description Accounts for instances where a style object is inlined in the JSX attribute
         *
         * @example
         * <EuiCode style={{ color: '#dd4040' }}>This is an example</EuiCode>
         *
         * @example
         * <EuiCode css={{ color: '#dd4040' }}>This is an example</EuiCode>
         *
         * @example
         * const styleRules = { color: '#dd4040' };
         * <EuiCode style={{ color: styleRules.color }}>This is an example</EuiCode>
         *
         * @example
         * const styleRules = { color: '#dd4040' };
         * <EuiCode css={{ color: styleRules.color }}>This is an example</EuiCode>
         */
        if (
          node.value?.type === 'JSXExpressionContainer' &&
          node.value.expression.type === 'ObjectExpression'
        ) {
          const declarationPropertiesNode = node.value.expression.properties;

          declarationPropertiesNode?.forEach((property) => {
            handleObjectProperties(context, node, property, {
              loc: property.loc,
              messageId: 'noCssColorSpecific',
              data: {
                property:
                  property.type === 'SpreadElement'
                    ? // @ts-expect-error the key name is always present else this code will not execute
                      String(property.argument.name)
                    : // @ts-expect-error the key name is always present else this code will not execute
                      String(property.key.name),
              },
            });
          });

          return;
        }

        if (node.name.name === 'css' && node.value?.type === 'JSXExpressionContainer') {
          /**
           * @example
           * <EuiCode css={`{ color: '#dd4040' }`}>This is an example</EuiCode>
           */
          if (node.value.expression.type === 'TemplateLiteral') {
            for (let i = 0; i < node.value.expression.quasis.length; i++) {
              const declarationTemplateNode = node.value.expression.quasis[i];

              if (htmlElementColorDeclarationRegex.test(declarationTemplateNode.value.raw)) {
                const cssText = declarationTemplateNode.value.raw
                  .replace(/(\{|\}|\\n)/g, '')
                  .trim();

                cssText.split(';').forEach((declaration) => {
                  if (
                    declaration.length > 0 &&
                    checkPropertySpecifiesInvalidCSSColor(declaration.split(':'))
                  ) {
                    context.report({
                      node: declarationTemplateNode,
                      messageId: 'noCssColor',
                    });
                  }
                });
              }
            }
          }

          /**
           * @example
           * <EuiCode css={() => ({ color: '#dd4040' })}>This is an example</EuiCode>
           */
          if (
            node.value.expression.type === 'FunctionExpression' ||
            node.value.expression.type === 'ArrowFunctionExpression'
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
