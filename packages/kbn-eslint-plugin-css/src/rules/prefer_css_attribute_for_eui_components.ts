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
import type { Identifier, Node } from 'estree';

export const PreferCSSAttributeForEuiComponents: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer the JSX css attribute for EUI components',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      preferCSSAttributeForEuiComponents: 'Prefer the css attribute for EUI components',
    },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    const isNamedEuiComponentRegex = /^Eui[A-Z]*/;

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (isNamedEuiComponentRegex.test((node.name as unknown as Identifier).name)) {
          let styleAttrNode: TSESTree.JSXAttribute | undefined;

          if (
            // @ts-expect-error the returned result is somehow typed as a union of JSXAttribute and JSXAttributeSpread
            (styleAttrNode = node.attributes.find(
              (attr) => attr.type === 'JSXAttribute' && attr.name.name === 'style'
            ))
          ) {
            context.report({
              node: styleAttrNode?.parent! as Node,
              messageId: 'preferCSSAttributeForEuiComponents',
              fix(fixer) {
                const cssAttr = node.attributes.find(
                  (attr) => attr.type === 'JSXAttribute' && attr.name.name === 'css'
                );

                if (cssAttr) {
                  return null;
                }

                return fixer.replaceTextRange(styleAttrNode?.name?.range!, 'css');
              },
            });
          }
        }
      },
    };
  },
};
