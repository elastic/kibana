/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRequire } from 'node:module';
import type { DummyRuleMap } from 'oxlint';

// Spread so rules added to the EUI preset turn on with the plugin upgrade. The package's ESM
// types are empty, hence `require` with an explicit shape.
const {
  configs: { recommended },
}: { configs: { recommended: { rules: DummyRuleMap } } } = createRequire(import.meta.url)(
  '@elastic/eslint-plugin-eui'
);

export const euiRules: DummyRuleMap = {
  ...recommended.rules,

  /**
   * EUI Team rules
   */
  '@elastic/eui/callout-prefer-props-for-content': [
    'warn',
    {
      components: [
        'EuiCallOut',
        'KbnInfoCallout',
        'KbnSuccessCallout',
        'KbnWarningCallout',
        'KbnDangerCallout',
      ],
    },
  ],
  '@elastic/eui/no-restricted-eui-imports': [
    'warn',
    {
      patterns: ['@kbn/ui-theme'],
      message: 'For client-side, please use `useEuiTheme` instead.',
    },
  ],

  /**
   * a11y-related rules:
   * all existing violations were fixed; keep this as error to prevent new ones.
   */
  '@elastic/eui/callout-announce-on-mount': 'error',
  '@elastic/eui/prefer-eui-icon-tip': 'error',
  '@elastic/eui/sr-output-disabled-tooltip': 'error',
  '@elastic/eui/badge-accessibility-rules': 'error',
  '@elastic/eui/no-unnamed-interactive-element': 'error',
  '@elastic/eui/consistent-is-invalid-props': 'error',
  '@elastic/eui/tooltip-no-interactive-content': 'error',
  '@elastic/eui/require-table-caption': 'error',
  '@elastic/eui/accessible-interactive-element': 'error',
  '@elastic/eui/icon-accessibility-rules': 'error',
  '@elastic/eui/tooltip-button-icon-wrap': 'error',
  '@elastic/eui/tooltip-focusable-anchor': 'error',
  '@elastic/eui/no-unnamed-radio-group': 'error',
  '@elastic/eui/require-aria-label-for-modals': 'error',
};
