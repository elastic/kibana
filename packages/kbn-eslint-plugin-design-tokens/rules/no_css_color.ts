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

export const noCssColor: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Use color definitions from eui theme as opposed to CSS color values',
      category: 'Best Practices',
      recommended: true,
      url: 'https://eui.elastic.co/#/theming/colors/values',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.name !== 'style') {
          return;
        }

        if (node.value && node.value.type === 'Literal' && typeof node.value.value === 'string') {
          const value = node.value.value;
          if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
            context.report({
              node,
              message: 'Avoid using CSS colors',
            });
          }
        }
      },
    };
  },
};
