/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Rule } from 'eslint';

const SEMANTIC_PACKAGE = '@kbn/ui-callout';

const COLOR_TO_WRAPPER: Record<string, string> = {
  primary: 'InfoCallout',
  success: 'SuccessCallout',
  warning: 'WarningCallout',
  danger: 'ErrorCallout',
};

/**
 * Returns the string value of a JSX attribute's value node, or undefined if
 * the value is not a simple string literal.
 */
const getStringValue = (valueNode: TSESTree.JSXAttribute['value']): string | undefined => {
  if (!valueNode) return undefined;
  if (valueNode.type === 'Literal' && typeof valueNode.value === 'string') {
    return valueNode.value;
  }
  return undefined;
};

export const PreferKbnUiCallout: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: `Disallow direct usage of EuiCallOut in favour of semantic wrapper components from ${SEMANTIC_PACKAGE}`,
      category: 'Migration',
      recommended: true,
    },
    messages: {
      noDirectEuiCallOutJsx: `Use a semantic wrapper from '${SEMANTIC_PACKAGE}' instead of <EuiCallOut> directly. Choose InfoCallout, SuccessCallout, WarningCallout, or ErrorCallout based on intent.`,
      noDirectEuiCallOutJsxWithColor: `Use <{{wrapper}}> from '${SEMANTIC_PACKAGE}' instead of <EuiCallOut color="{{color}}">.`,
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node: Rule.Node) {
        const jsxNode = node as unknown as TSESTree.JSXOpeningElement;
        if (jsxNode.name.type !== 'JSXIdentifier' || jsxNode.name.name !== 'EuiCallOut') {
          return;
        }

        const colorAttr = jsxNode.attributes.find(
          (attr): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'color'
        );

        const color = colorAttr ? getStringValue(colorAttr.value) : undefined;
        const wrapper = color ? COLOR_TO_WRAPPER[color] : undefined;

        if (wrapper && color) {
          context.report({
            node,
            messageId: 'noDirectEuiCallOutJsxWithColor',
            data: { wrapper, color },
          });
        } else {
          context.report({
            node,
            messageId: 'noDirectEuiCallOutJsx',
          });
        }
      },
    };
  },
};
