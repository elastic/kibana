/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DummyRuleMap, OxlintOverride } from 'oxlint';

export const reactRules: DummyRuleMap = {
  'react/no-multi-comp': ['error', { ignoreStateless: true }],
  'react/no-unknown-property': ['error', { ignore: ['css'] }],
  'react/prefer-es6-class': ['error', 'always'],
  'jsx-a11y/alt-text': 'error',
  'jsx-a11y/anchor-has-content': 'error',
  'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
  'jsx-a11y/aria-props': 'error',
  'jsx-a11y/aria-proptypes': 'error',
  'jsx-a11y/aria-role': 'error',
  'jsx-a11y/aria-unsupported-elements': 'error',
  'jsx-a11y/click-events-have-key-events': 'error',
  'jsx-a11y/heading-has-content': 'error',
  'jsx-a11y/html-has-lang': 'error',
  'jsx-a11y/iframe-has-title': 'error',
  'jsx-a11y/interactive-supports-focus': 'error',
  'jsx-a11y/label-has-associated-control': 'error',
  'jsx-a11y/media-has-caption': 'error',
  'jsx-a11y/mouse-events-have-key-events': 'error',
  'jsx-a11y/no-access-key': 'error',
  'jsx-a11y/no-distracting-elements': 'error',
  'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
  'jsx-a11y/no-noninteractive-element-interactions': 'error',
  'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
  // 'jsx-a11y/no-onchange': 'error',
  'jsx-a11y/no-redundant-roles': 'error',
  'jsx-a11y/role-has-required-aria-props': 'error',
  'jsx-a11y/role-supports-aria-props': 'error',
  'jsx-a11y/scope': 'error',
  'jsx-a11y/tabindex-no-positive': 'error',

  // 'react-hooks/exhaustive-deps': 'error',
  // 'react-hooks/rules-of-hooks': 'error',
  'react/jsx-no-duplicate-props': 'error',
  'react/jsx-no-undef': 'error',
  'react/jsx-pascal-case': 'error',
  // 'react/jsx-uses-react': 'error',
  // 'react/jsx-uses-vars': 'error',
  'react/no-danger': 'error',
  'react/no-is-mounted': 'error',
  'react/no-unescaped-entities': 'error',
  'react/no-will-update-set-state': 'error',
  '@kbn/compat/react-prefer-stateless-function': ['error', { ignorePureComponents: true }],
  'react/react-in-jsx-scope': 'error',
  'react/self-closing-comp': 'error',
};

// Shared by the security solution, workflows, and lists overrides.
const strictReactRules: DummyRuleMap = {
  'react/button-has-type': 'error',
  'react/no-children-prop': 'error',
  'react/no-danger-with-children': 'error',
  'react/no-did-mount-set-state': 'error',
  'react/no-direct-mutation-state': 'error',
  'react/no-find-dom-node': 'error',
  'react/no-redundant-should-component-update': 'error',
  'react/no-render-return-value': 'error',
  'react/no-string-refs': 'error',
  'react/no-this-in-sfc': 'error',
  'react/no-unsafe': 'error',
  'react/void-dom-elements-no-children': 'error',
  'react/jsx-no-comment-textnodes': 'error',
  'react/jsx-no-target-blank': 'error',
  'react/jsx-fragments': 'error',
  '@kbn/compat/react-boolean-prop-naming': 'error',
  '@kbn/compat/react-no-deprecated': 'error',
  '@kbn/compat/react-no-typos': 'error',
  '@kbn/compat/react-no-unused-prop-types': 'error',
  '@kbn/compat/react-sort-default-props': 'error',
};

export const reactOverrides: OxlintOverride[] = [
  {
    files: [
      'x-pack/platform/plugins/private/canvas/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/private/cross_cluster_replication/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'jsx-a11y/click-events-have-key-events': 'off',
    },
  },
  {
    files: [
      'x-pack/solutions/observability/plugins/apm/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/plugins/observability/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/plugins/exploratory_view/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/plugins/ux/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/plugins/slo/**/*.{js,mjs,ts,tsx}',
    ],
    excludeFiles: [
      'x-pack/solutions/observability/plugins/apm/**/*.stories.*',
      'x-pack/solutions/observability/plugins/observability/**/*.stories.*',
      'x-pack/solutions/observability/plugins/exploratory_view/**/*.stories.*',
      'x-pack/solutions/observability/plugins/slo/**/*.stories.*',
    ],
    rules: {
      'react/function-component-definition': [
        'warn',
        {
          namedComponents: 'function-declaration',
          unnamedComponents: 'arrow-function',
        },
      ],
    },
  },
  {
    files: [
      'x-pack/solutions/security/plugins/ecs_data_quality_dashboard/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/elastic_assistant/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/automatic_import/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant-common/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/shared/kbn-langchain/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/packages/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_ess/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_serverless/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/timelines/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/cases/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-cell-actions/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/workflows_management/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/workflows_execution_engine/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/workflows_extensions/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-workflows/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-workflows-ui/**/*.{js,mjs,ts,tsx}',
    ],
    rules: strictReactRules,
  },
  {
    files: [
      'x-pack/solutions/security/plugins/lists/public/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/lists/common/*.{ts,tsx}',
    ],
    rules: {
      ...strictReactRules,
      'react/no-did-update-set-state': 'error',
    },
  },
  {
    files: ['x-pack/solutions/search/plugins/enterprise_search/**/*.{ts,tsx}'],
    rules: {
      'react/jsx-boolean-value': ['error', 'never'],
    },
  },
  {
    files: ['x-pack/platform/plugins/private/canvas/**/*.js'],
    rules: {
      'react/no-did-mount-set-state': 'error',
      'react/no-did-update-set-state': 'error',
      'react/jsx-boolean-value': 'error',
      'react/forbid-elements': [
        'error',
        {
          forbid: [
            { element: 'EuiConfirmModal', message: 'Use <ConfirmModal> instead' },
            { element: 'EuiPopover', message: 'Use <Popover> instead' },
            { element: 'EuiIconTip', message: 'Use <TooltipIcon> instead' },
          ],
        },
      ],
    },
  },
  {
    // The `plugin:react/recommended` rules that oxlint implements; osquery extends that preset in ESLint.
    files: ['x-pack/platform/plugins/shared/osquery/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'react/jsx-key': 'error',
      'react/jsx-no-comment-textnodes': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/require-render-return': 'error',
      '@kbn/compat/react-no-deprecated': 'error',
    },
  },
];
