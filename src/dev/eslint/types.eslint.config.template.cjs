/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * THIS FILE IS WRITTEN AUTOMATICALLY by `node scripts/eslint_with_types` and
 * should be deleted automatically unless something goes wrong
 */

const config = JSON.parse('{PACKAGE_CONFIG}');

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: config.rootDir,
    project: ['./tsconfig.json'],
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/consistent-type-exports': 'error',
  },
  overrides: [
    {
      files: [
        'server/**/*',
        'accessibility/apps/**/*',
        'analytics/tests/**/*',
        '*functional*/**/*',
        '*api_integration*/**/*',
        'cloud_integration/tests/**/*',
        'custom_branding/tests/**/*',
        'disable_ems/tests/**/*',
        'examples/**/*',
        'fleet_multi_cluster/apps/**/*',
        'ftr_apis/**/*',
        'health_gateway/tests/**/*',
        'localization/tests/**/*',
        'plugin_api_perf/test_suites/**/*',
        'rule_registry/**/*',
        'search_sessions_integration/tests/**/*',
        'screenshot_creation/apps/**/*',
        'serverless/api_integration/**/*',
        'serverless/functional/**/*',
        'ui_capabilities/**/*',
        'upgrade/apps/**/*',
        'usage_collection/test_suites/**/*',
        'src/playwright/page_objects/**/*',
        'test/scout/**/*',
        // when tsconfig.json is defined in 'scout/test/ui|api' folders
        'parallel_tests/**/*.spec.ts',
        'tests/**/*.spec.ts',
        'fixtures/page_objects/**/*',
      ],
      rules: {
        // Let's focus on server-side errors first to avoid server crashes.
        // We'll tackle /public eventually.
        '@typescript-eslint/no-floating-promises': [
          'error',
          {
            ignoreIIFE: false,
            checkThenables: true, // check for thenable objects (not just native Promises)
          },
        ],
      },
    },
    {
      files: [
        '*spaces_api_integration/common/services/basic_auth_supertest.ts',
        '*security_solution_api_integration/scripts/mki_api_ftr_execution.ts',
      ],
      rules: {
        '@typescript-eslint/no-floating-promises': 'off',
      },
    },
  ],
};
