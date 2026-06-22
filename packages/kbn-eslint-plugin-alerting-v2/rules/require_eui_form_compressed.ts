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
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';

const COMPRESSED_FORM_COMPONENTS = [
  'EuiFieldText',
  'EuiFieldNumber',
  'EuiSelect',
  'EuiComboBox',
  'EuiSuperSelect',
  'EuiTextArea',
  'EuiSuperDatePicker',
];

export const RequireEuiFormCompressed: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require the compressed prop on EUI form controls in the alerting v2 rule form.',
    },
    messages: {
      missingCompressed: '{{component}} should use the `compressed` prop in rule form components.',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXIdentifier: (node: TSESTree.Node) => {
        if (!('name' in node)) return;

        const name = String(node.name);
        const parent = node.parent;

        if (
          parent?.type !== AST_NODE_TYPES.JSXOpeningElement ||
          !COMPRESSED_FORM_COMPONENTS.includes(name)
        ) {
          return;
        }

        const attributes = (parent as TSESTree.JSXOpeningElement).attributes;

        const hasCompressed = attributes.some(
          (attr) =>
            attr.type === AST_NODE_TYPES.JSXAttribute &&
            attr.name.type === AST_NODE_TYPES.JSXIdentifier &&
            attr.name.name === 'compressed'
        );

        if (!hasCompressed) {
          context.report({
            node,
            messageId: 'missingCompressed',
            data: { component: name },
          });
        }
      },
    };
  },
};
