/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CreateOnceRule } from '@oxlint/plugins';

/**
 * Maps component names to the prop that must carry a "compressed" value.
 * - `prop` only: the prop must exist (boolean style, e.g. `compressed`).
 * - `prop` + `value`: the prop must equal that literal or be a dynamic expression.
 */
const COMPRESSED_REQUIREMENTS: Record<string, { prop: string; value?: string }> = {
  EuiFieldText: { prop: 'compressed' },
  EuiFieldNumber: { prop: 'compressed' },
  EuiSelect: { prop: 'compressed' },
  EuiComboBox: { prop: 'compressed' },
  EuiSuperSelect: { prop: 'compressed' },
  EuiTextArea: { prop: 'compressed' },
  EuiSuperDatePicker: { prop: 'compressed' },
  EuiButtonGroup: { prop: 'buttonSize', value: 'compressed' },
};

export const RequireEuiFormCompressed: CreateOnceRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require the compressed prop on EUI form controls in the alerting v2 rule form.',
    },
    messages: {
      missing: '{{component}} should use {{hint}} in rule form components.',
    },
    schema: [],
  },
  createOnce(context) {
    return {
      JSXIdentifier(node) {
        const { name, parent } = node;
        const requirement = COMPRESSED_REQUIREMENTS[name];
        if (!requirement || parent.type !== 'JSXOpeningElement') return;

        const { prop, value } = requirement;

        const hasRequiredProp = parent.attributes.some((attr) => {
          if (
            attr.type !== 'JSXAttribute' ||
            attr.name.type !== 'JSXIdentifier' ||
            attr.name.name !== prop
          ) {
            return false;
          }
          if (!value) return true;
          if (attr.value?.type === 'Literal' && attr.value.value === value) {
            return true;
          }
          return attr.value?.type === 'JSXExpressionContainer';
        });

        if (!hasRequiredProp) {
          const hint = value ? `\`${prop}="${value}"\`` : `the \`${prop}\` prop`;
          context.report({
            node,
            messageId: 'missing',
            data: { component: name, hint },
          });
        }
      },
    };
  },
};
