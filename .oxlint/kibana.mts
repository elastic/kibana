/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DummyRuleMap, OxlintOverride } from 'oxlint';

import { moduleMigrationRule } from './module_migration.mts';

const HOOK_FORM_LIB_DEPRECATION =
  '`hook_form_lib` is deprecated and will no longer be supported. Consider using `react-hook-form` for new and existing forms.';

export const kibanaRules: DummyRuleMap = {
  '@kbn/eslint/no_async_promise_body': 'error',
  '@kbn/eslint/no_async_foreach': 'error',
  '@kbn/eslint/require_kibana_feature_privileges_naming': 'warn',
  '@kbn/eslint/no_trailing_import_slash': 'error',
  '@kbn/eslint/no_constructor_args_in_property_initializers': 'error',
  '@kbn/eslint/no_this_in_property_initializers': 'error',
  '@kbn/eslint/no_conditional_saved_object_type_registration': 'error',
  '@kbn/eslint/no_unsafe_console': 'error',
  '@kbn/eslint/no_unsafe_hash': 'error',
  '@kbn/eslint/no_unsafe_dynamic_http_path': 'warn',
  '@kbn/eslint/no_wrapped_error_in_logger': 'error',
  '@kbn/eslint/no_npx_playwright': 'error',
  '@kbn/eslint/module_migration': moduleMigrationRule,
  '@kbn/disable/no_protected_eslint_disable': 'error',
  '@kbn/disable/no_naked_eslint_disable': 'error',
};

export const kibanaOverrides: OxlintOverride[] = [
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          paths: [
            {
              name: 'enzyme',
              message:
                'Enzyme is deprecated and no longer maintained. Please use @testing-library/react instead.',
            },
            {
              name: '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib',
              message: HOOK_FORM_LIB_DEPRECATION,
            },
          ],
          patterns: [
            {
              group: ['@kbn/es-ui-shared-plugin/static/forms/hook_form_lib/**'],
              message: HOOK_FORM_LIB_DEPRECATION,
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/platform/plugins/shared/**/*.ts',
      'x-pack/solutions/**/*.ts',
      'x-pack/plugins/**/*.ts',
      'x-pack/platform/plugins/shared/**/*.ts',
    ],
    excludeFiles: [
      '**/*.{test,spec}.ts',
      '**/*.test.ts',
      '**/test/**',
      '**/tests/**',
      '**/__tests__/**',
      '**/scripts/**',
      '**/e2e/**',
      '**/cypress/**',
      '**/ftr_e2e/**',
      '**/.storybook/**',
      '**/json_schemas/**',
      'src/platform/plugins/shared/telemetry/**',
      'x-pack/solutions/security/packages/test-api-clients/**',
      'x-pack/solutions/security/packages/kbn-security-evals-matrix/**',
      'x-pack/platform/plugins/shared/automatic_import/**',
    ],
    rules: {
      '@kbn/eslint/require_kbn_fs': [
        'error',
        {
          restrictedMethods: [
            'writeFile',
            'writeFileSync',
            'createWriteStream',
            'appendFile',
            'appendFileSync',
          ],
          disallowedMessage:
            'Use `@kbn/fs` for file write operations instead of direct `fs` in production code',
        },
      ],
    },
  },
  {
    files: [
      'x-pack/platform/test/api_integration_deployment_agnostic/apis/**/*.{js,ts}',
      'x-pack/platform/test/api_integration_deployment_agnostic/services/**/*.{js,ts}',
      'x-pack/solutions/**/test/api_integration_deployment_agnostic/apis/**/*.{js,ts}',
      'x-pack/solutions/**/test/api_integration_deployment_agnostic/services/**/*.{js,ts}',
    ],
    rules: {
      '@kbn/eslint/deployment_agnostic_test_context': 'error',
    },
  },
  {
    files: [
      'src/platform/plugins/private/event_annotation/**/*',
      'src/platform/plugins/private/event_annotation_listing/**/*',
      'src/platform/plugins/private/vis_default_editor/**/*',
      'src/platform/plugins/private/vis_types/**/*',
      'src/platform/plugins/shared/chart_expressions/**/*',
      'src/platform/plugins/shared/charts/**/*',
      'src/platform/plugins/shared/expressions/**/*',
      'src/platform/plugins/shared/vis_types/**/*',
      'src/platform/plugins/shared/visualization_listing/**/*',
      'src/platform/plugins/shared/visualizations/**/*',
      'x-pack/platform/plugins/shared/lens/**/*',
      'x-pack/platform/plugins/private/graph/**/*',
      'src/platform/packages/private/kbn-lens-formula-docs/**/*',
      'src/platform/packages/shared/kbn-lens-common/**/*',
      'src/platform/packages/shared/kbn-lens-common-2/**/*',
      'src/platform/packages/shared/kbn-coloring/**/*',
      'src/platform/packages/shared/kbn-chart-icons/**/*',
      'src/platform/packages/shared/kbn-event-annotation-common/**/*',
      'src/platform/packages/shared/kbn-event-annotation-components/**/*',
    ],
    rules: {
      '@kbn/eslint/no_viz_naming': 'error',
    },
  },
  {
    files: [
      'src/platform/plugins/**/server/index.ts',
      'x-pack/platform/plugins/**/server/index.ts',
      'x-pack/solutions/**/plugins/**/server/index.ts',
      'examples/**/server/index.ts',
      'packages/kbn-mock-idp-plugin/server/index.ts',
    ],
    excludeFiles: ['**/test/**'],
    rules: {
      '@kbn/eslint/no_sync_import_from_plugin': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    excludeFiles: [
      '**/*.test.{ts,tsx}',
      '**/*.mock.{ts,tsx}',
      '**/*.stories.{ts,tsx}',
      '**/__tests__/**',
      '**/__mocks__/**',
      '**/__fixtures__/**',
      '**/__snapshots__/**',
      '**/test/**',
      '**/tests/**',
      '**/scripts/**',
      '**/cypress/**',
      '**/e2e/**',
      '**/ftr_e2e/**',
      '**/.storybook/**',
      'src/platform/packages/shared/kbn-zod/**',
    ],
    rules: {
      '@kbn/eslint/require_lazy_zod_schema': 'warn',
    },
  },
  {
    // Plugin and core index files must list the APIs they expose instead of using `export *`.
    files: [
      'src/core/{server,public,common}/index.ts',
      'src/platform/plugins/**/{server,public,common}/index.ts',
      'x-pack/platform/plugins/**/{server,public,common}/index.ts',
      'x-pack/solutions/*/plugins/**/{server,public,common}/index.ts',
    ],
    rules: {
      '@kbn/eslint/no_export_all': 'error',
    },
  },
];
