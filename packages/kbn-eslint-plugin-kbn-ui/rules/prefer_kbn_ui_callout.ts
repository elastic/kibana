/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CreateOnceRule, ESTree } from '@oxlint/plugins';

const SEMANTIC_PACKAGE = '@kbn/ui-callout';

const COLOR_TO_WRAPPER: Record<string, string> = {
  primary: 'KbnInfoCallout',
  success: 'KbnSuccessCallout',
  warning: 'KbnWarningCallout',
  danger: 'KbnDangerCallout',
};

/**
 * Returns the string value of a JSX attribute's value node, or undefined if
 * the value is not a simple string literal.
 */
const getStringValue = (valueNode: ESTree.JSXAttribute['value']): string | undefined => {
  if (!valueNode) return undefined;
  if (valueNode.type === 'Literal' && typeof valueNode.value === 'string') {
    return valueNode.value;
  }
  return undefined;
};

export const PreferKbnUiCallout: CreateOnceRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: `Disallow direct usage of EuiCallOut in favour of semantic wrapper components from ${SEMANTIC_PACKAGE}`,
      category: 'Migration',
      recommended: true,
    },
    messages: {
      noDirectEuiCallOutJsx: `Use <KbnInfoCallout> from '${SEMANTIC_PACKAGE}' instead of <EuiCallOut> (defaults to color="primary").`,
      noDirectEuiCallOutJsxWithColor: `Use <{{wrapper}}> from '${SEMANTIC_PACKAGE}' instead of <EuiCallOut color="{{color}}">.`,
      noDirectEuiCallOutJsxSpread: `Use a semantic wrapper from '${SEMANTIC_PACKAGE}' instead of <EuiCallOut>. Color may be set via spread props — choose KbnInfoCallout, KbnSuccessCallout, KbnWarningCallout, or KbnDangerCallout based on the resolved color value.`,
    },
    schema: [],
  },
  createOnce(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'EuiCallOut') {
          return;
        }

        const hasSpread = node.attributes.some((attr) => attr.type === 'JSXSpreadAttribute');

        const colorAttr = node.attributes.find(
          (attr): attr is ESTree.JSXAttribute =>
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
        } else if (hasSpread && !color) {
          context.report({
            node,
            messageId: 'noDirectEuiCallOutJsxSpread',
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
