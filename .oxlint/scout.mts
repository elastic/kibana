/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintOverride } from 'oxlint';

/** Order matters: the API test overrides refine the generic one for their directories. */
export const scoutOverrides: OxlintOverride[] = [
  {
    files: [
      '{src/platform,src/core,x-pack/**}/{plugins,packages}/**/test/scout{_*,}/**/*.ts',
      '{examples,x-pack/examples}/**/test/scout{_*,}/**/*.ts',
      'src/core/test/scout{_*,}/**/*.ts',
      'packages/**/test/scout{_*,}/**/*.ts',
    ],
    excludeFiles: ['src/platform/packages/shared/kbn-scout/test/**'],
    rules: {
      '@kbn/eslint/scout_no_describe_configure': 'error',
      '@kbn/eslint/scout_test_file_naming': 'error',
      '@kbn/eslint/scout_require_global_setup_hook_in_parallel_tests': 'error',
      '@kbn/eslint/scout_no_es_archiver_in_parallel_tests': 'error',
      '@kbn/eslint/scout_max_one_describe': 'error',
      '@kbn/eslint/scout_no_core_settings_in_space_test': 'warn',
      '@kbn/eslint/scout_no_deprecated_tags': 'error',
      '@kbn/eslint/scout_no_cross_boundary_imports': 'error',
      '@kbn/eslint/scout_expect_import': 'error',
      '@kbn/eslint/scout_no_at_in_test_titles': 'warn',
      '@kbn/eslint/scout_no_promise_all_with_playwright_apis': 'error',
      '@kbn/eslint/scout_no_locators': ['error', { restricted: ['globalLoadingIndicator'] }],
      '@kbn/eslint/require_include_in_check_a11y': 'warn',
    },
  },
  {
    // Platform & Solutions API Tests
    files: [
      'src/platform/plugins/**/test/{scout,scout_*}/**/api/**/*.ts',
      'x-pack/platform/**/plugins/**/test/{scout,scout_*}/**/api/**/*.ts',
      'x-pack/solutions/**/plugins/**/test/{scout,scout_*}/**/api/**/*.ts',
    ],
    rules: {
      '@kbn/eslint/scout_require_api_client_in_api_test': [
        'error',
        { alternativeFixtures: ['esClient'] },
      ],
    },
  },
  {
    // Security Solution API tests may call endpoints through the generated Scout API clients
    // exposed by `@kbn/security-solution-test-api-clients/scout`
    files: ['x-pack/solutions/security/plugins/**/test/{scout,scout_*}/**/api/**/*.ts'],
    rules: {
      '@kbn/eslint/scout_require_api_client_in_api_test': [
        'error',
        {
          alternativeFixtures: [
            'esClient',
            'detectionsApi',
            'discoveriesApi',
            'endpointExceptionsApi',
            'endpointManagementApi',
            'entityAnalyticsApi',
            'exceptionsApi',
            'listsApi',
            'osqueryApi',
            'timelinesApi',
          ],
        },
      ],
    },
  },
  {
    // Agent Builder API tests authenticate through role-scoped API client fixtures
    files: [
      'x-pack/platform/plugins/shared/agent_builder/test/scout_agent_builder/*/api/**/*.ts',
      'x-pack/platform/plugins/shared/agent_builder/test/scout_agent_builder_smoke/api/**/*.ts',
    ],
    rules: {
      '@kbn/eslint/scout_require_api_client_in_api_test': [
        'error',
        { alternativeFixtures: ['esClient', 'asAdmin', 'asViewer', 'asPrivilegedUser'] },
      ],
    },
  },
  {
    // Workflows API tests use WorkflowsApiService (wrapping kbnClient/API) for workflow operations
    files: [
      'src/platform/plugins/shared/workflows_management/test/scout/api/**/*.ts',
      'src/platform/plugins/shared/workflows_management/test/scout_workflows_oom_testing/api/**/*.ts',
    ],
    rules: {
      '@kbn/eslint/scout_require_api_client_in_api_test': 'off',
    },
  },
];
