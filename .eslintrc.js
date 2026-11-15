/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/swc-register').install();

const { TESTABLE_COMPONENT_SCOUT_ROOT_PATH_GLOB } = require('@kbn/scout-info');

const SCOUT_TEST_FILE_GLOBS = [
  `${TESTABLE_COMPONENT_SCOUT_ROOT_PATH_GLOB}/**/*.ts`,
  'packages/**/test/scout{_*,}/**/*.ts',
  'src/dev/build/test/scout{_*,}/**/*.ts',
];

module.exports = {
  root: true,

  extends: ['@kbn/eslint-config'],

  overrides: [
    /**
     * `formatjs/*` rules run in oxlint (.oxlint/formatjs.mts). The plugin stays registered so
     * `eslint-disable` directives naming its rules resolve.
     */
    {
      files: ['{src,x-pack,packages}/**/*.{js,mjs,ts,tsx}'],
      plugins: ['formatjs'],
    },

    /**
     * APM, UX and Observability overrides
     */
    {
      files: [
        'x-pack/solutions/observability/plugins/apm/**/*.{ts,tsx}',
        'x-pack/solutions/observability/plugins/apm_data_access/**/*.{ts,tsx}',
        'x-pack/solutions/observability/plugins/infra/**/*.{ts,tsx}',
        'x-pack/solutions/observability/plugins/inventory/**/*.{ts,tsx}',
        'x-pack/solutions/observability/plugins/metrics_data_access/**/*.{ts,tsx}',
        'x-pack/solutions/observability/plugins/profiling/**/*.{ts,tsx}',
        'x-pack/solutions/observability/plugins/profiling_data_access/**/*.{ts,tsx}',
      ],
    },

    /**
     * Fleet overrides
     */
    {
      files: ['x-pack/platform/plugins/shared/fleet/**/*.{js,mjs,ts,tsx}'],
      // `testing-library/*` rules run in oxlint (.oxlint/testing_library.mts); registered for `eslint-disable` directives.
      plugins: ['testing-library'],
    },

    /**
     * Automatic Import overrides
     */
    {
      files: [
        'x-pack/platform/plugins/shared/automatic_import/public/**/*.{ts,tsx}',
        'x-pack/platform/plugins/shared/automatic_import/common/**/*.{ts,tsx}',
      ],
    },

    /**
     * ML overrides
     */
    {
      files: [
        'x-pack/platform/plugins/shared/aiops/**/*.{ts,tsx}',
        'x-pack/platform/plugins/private/data_visualizer/**/*.{ts,tsx}',
        'x-pack/platform/plugins/shared/ml/**/*.{ts,tsx}',
        'x-pack/platform/plugins/private/transform/**/*.{ts,tsx}',
        'x-pack/platform/packages/shared/ml/**/*.{ts,tsx}',
        'x-pack/platform/packages/private/ml/**/*.{ts,tsx}',
        'x-pack/platform/plugins/private/file_upload/**/*.{ts,tsx}',
      ],
    },

    /**
     * Security Solution overrides. These rules below are maintained and owned by
     * the people within the security-detection-engine team. Please see ping them
     * or check with them if you are encountering issues, have suggestions, or would
     * like to add, change, or remove any particular rule. Linters, Typescript, and rules
     * evolve and change over time just like coding styles, so please do not hesitate to
     * reach out.
     */
    {
      // typescript and javascript for front and back end
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
        'x-pack/solutions/security/packages/data-stream-adapter/**/*.{js,mjs,ts,tsx}',
        'src/platform/packages/shared/kbn-cell-actions/**/*.{js,mjs,ts,tsx}',
      ],
      plugins: ['eslint-plugin-n', 'react'],
      env: {
        jest: true,
      },
      rules: {
        'no-duplicate-imports': 'off',
      },
      overrides: [
        {
          files: [
            'x-pack/platform/plugins/shared/cases/**/*.{ts,tsx}',
            'x-pack/solutions/security/plugins/ecs_data_quality_dashboard/**/*.{ts,tsx}',
            'x-pack/solutions/security/plugins/security_solution/**/*.{ts,tsx}',
            'x-pack/solutions/security/plugins/security_solution_ess/**/*.{ts,tsx}',
            'x-pack/solutions/security/plugins/security_solution_serverless/**/*.{ts,tsx}',
            'x-pack/solutions/security/packages/data-stream-adapter/**/*.{ts,tsx}',
            'x-pack/solutions/security/packages/features/**/*.{ts,tsx}',
            'x-pack/solutions/security/packages/navigation/**/*.{ts,tsx}',
            'src/platform/packages/shared/kbn-cell-actions/**/*.{ts,tsx}',
          ],
        },
      ],
    },
    {
      files: ['x-pack/platform/plugins/shared/cases/public/**/*.{js,mjs,ts,tsx}'],
      excludedFiles: ['x-pack/platform/plugins/shared/cases/**/*.{test,mock,test_helper}.{ts,tsx}'],
      // Stays in ESLint: with `ignoreTranspilerName`, oxlint's `react/display-name` also flags
      // `React.memo(Component)` when `Component` already sets `displayName`.
      rules: {
        'react/display-name': ['error', { ignoreTranspilerName: true }],
      },
    },
    {
      files: ['x-pack/platform/plugins/shared/cases/**/*.{test,mock,test_helper}.tsx'],
      // `testing-library/*` rules run in oxlint (.oxlint/testing_library.mts); registered for `eslint-disable` directives.
      plugins: ['testing-library'],
    },

    /**
     * Lists overrides. These rules below are maintained and owned by
     * the people within the security-detection-engine team. Please see ping them
     * or check with them if you are encountering issues, have suggestions, or would
     * like to add, change, or remove any particular rule. Linters, Typescript, and rules
     * evolve and change over time just like coding styles, so please do not hesitate to
     * reach out.
     */
    {
      // typescript for /public and /common
      files: [
        'x-pack/solutions/security/plugins/lists/public/*.{ts,tsx}',
        'x-pack/solutions/security/plugins/lists/common/*.{ts,tsx}',
      ],
      plugins: ['react'],
      env: {
        jest: true,
      },
    },
    {
      files: ['**/kbn-scout*/src/playwright/**/*.ts', ...SCOUT_TEST_FILE_GLOBS],
      excludedFiles: ['src/platform/packages/shared/kbn-scout/src/playwright/**/*.test.ts'],
      // `eslint-plugin-playwright` rules run in oxlint (.oxlint/playwright.mts). The plugin stays
      // registered so `eslint-disable` directives naming its rules resolve.
      plugins: ['playwright'],
      rules: {
        // Turned off by `plugin:playwright/recommended`: fixtures are often destructured as `({}, testInfo)`.
        'no-empty-pattern': 'off',
      },
    },
    {
      files: ['x-pack/solutions/security/plugins/lists/public/**/!(*.test).{js,mjs,ts,tsx}'],
      // `react-perf/*` rules run in oxlint (.oxlint/team_overrides.mts); registered for `eslint-disable` directives.
      plugins: ['react-perf'],
    },
    {
      // typescript and javascript for front and back
      files: ['x-pack/solutions/security/plugins/lists/**/*.{js,mjs,ts,tsx}'],
      plugins: ['eslint-plugin-n'],
      env: {
        jest: true,
      },
      rules: {
        'no-duplicate-imports': 'off',
      },
    },

    /**
     * ResponseOps overrides
     */
    {
      files: [
        'src/platform/packages/shared/response-ops/**/*.{ts, tsx}',
        'x-pack/platform/plugins/shared/alerting/**/*.{ts,tsx}',
        'x-pack/platform/plugins/shared/actions/**/*.{ts,tsx}',
        'x-pack/platform/plugins/shared/stack_alerts/**/*.{ts, tsx}',
        'x-pack/platform/plugins/shared/stack_connectors/**/*.{ts, tsx}',
        'x-pack/platform/plugins/shared/triggers_actions_ui/**/*.{ts, tsx}',
        'x-pack/platform/plugins/shared/event_log/**/*.{ts, tsx}',
        'x-pack/platform/plugins/shared/rule_registry/**/*.{ts, tsx}',
        'x-pack/platform/plugins/shared/task_manager/**/*.{ts, tsx}',
        'x-pack/solutions/observability/packages/kbn-alerts-grouping/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-alerts-ui-shared/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-alerting-types/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-cases-components/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-actions-types/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-alerts-as-data-utils/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-grouping/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-rrule/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-rule-data-utils/**/*.{ts, tsx}',
        'src/platform/packages/shared/kbn-triggers-actions-ui-types/**/*.{ts, tsx}',
        'x-pack/platform/packages/shared/kbn-alerting-comparators/**/*.{ts, tsx}',
        'x-pack/platform/plugins/shared/embeddable_alerts_table/**/*.{ts,tsx}',
        'x-pack/platform/test/alerting_api_integration/**/*.{ts, tsx}',
        'x-pack/platform/test/cases_api_integration/**/*.{ts, tsx}',
        'x-pack/platform/test/reporting_api_integration/**/*.{ts, tsx}',
        'x-pack/solutions/**/test/cases_api_integration/**/*.{ts, tsx}',
        'x-pack/platform/test/rule_registry/**/*.{ts, tsx}',
        'x-pack/platform/test/api_integration/apis/cases/**/*.{ts, tsx}',
        'x-pack/solutions/**/test/api_integration/apis/cases/**/*.{ts, tsx}',
      ],
    },

    /**
     * Canvas overrides
     */
    {
      files: ['x-pack/platform/plugins/private/canvas/canvas_plugin_src/**/*.js'],
      globals: { canvas: true },
    },
    {
      files: ['x-pack/platform/plugins/private/canvas/public/**/*.js'],
      env: {
        browser: true,
      },
    },

    /**
     * Osquery overrides
     */
    {
      files: ['x-pack/platform/plugins/shared/osquery/**/*.{ts,tsx}'],
    },
    {
      // typescript and javascript for front end react performance
      files: ['x-pack/platform/plugins/shared/osquery/public/**/!(*.test).{js,mjs,ts,tsx}'],
      // `react-perf/*` rules run in oxlint (.oxlint/team_overrides.mts); registered for `eslint-disable` directives.
      plugins: ['react', 'react-perf'],
    },

    /**
     * Platform Security Team overrides
     */
    {
      files: [
        'src/platform/plugins/private/interactive_setup/**/*.{ts,tsx}',

        'packages/kbn-mock-idp-plugin/**/*.{ts,tsx}',
        'src/platform/packages/private/kbn-mock-idp-utils/**/*.{ts,tsx}',
        'src/platform/packages/shared/kbn-security-hardening/**/*.{ts,tsx}',
        'src/platform/packages/shared/kbn-user-profile-components/**/*.{ts,tsx}',

        'x-pack/platform/plugins/shared/encrypted_saved_objects/**/*.{ts,tsx}',
        'x-pack/platform/test/encrypted_saved_objects_api_integration/**/*.{ts,tsx}',

        'x-pack/platform/plugins/shared/security/**/*.{ts,tsx}',
        'x-pack/platform/packages/private/security/**/*.{ts,tsx}',
        'x-pack/platform/packages/shared/security/**/*.{ts,tsx}',
        'x-pack/platform/test/security_api_integration/**/*.{ts,tsx}',
        'x-pack/platform/test/security_functional/**/*.{ts,tsx}',

        'x-pack/platform/plugins/shared/spaces/**/*.{ts,tsx}',
        'x-pack/platform/test/spaces_api_integration/**/*.{ts,tsx}',
      ],
    },

    /**
     * Workflows Team: generic rules
     */
    {
      files: [
        'src/platform/plugins/shared/workflows_management/**/*.{js,mjs,ts,tsx}',
        'src/platform/plugins/shared/workflows_execution_engine/**/*.{js,mjs,ts,tsx}',
        'src/platform/plugins/shared/workflows_extensions/**/*.{js,mjs,ts,tsx}',
        'src/platform/packages/shared/kbn-workflows/**/*.{js,mjs,ts,tsx}',
        'src/platform/packages/shared/kbn-workflows-ui/**/*.{js,mjs,ts,tsx}',
      ],
      plugins: ['eslint-plugin-n', 'react'],
      env: {
        jest: true,
      },
      rules: {
        'no-duplicate-imports': 'off',
      },
    },
    /**
     * Workflows Team: public and common rules
     */
    {
      files: [
        'src/platform/plugins/shared/workflows_management/public/**/*.{js,mjs,ts,tsx}',
        'src/platform/plugins/shared/workflows_management/common/**/*.{js,mjs,ts,tsx}',
        'src/platform/plugins/shared/workflows_extensions/public/**/*.{js,mjs,ts,tsx}',
        'src/platform/plugins/shared/workflows_extensions/common/**/*.{js,mjs,ts,tsx}',
        'src/platform/packages/shared/kbn-workflows/**/*.{js,mjs,ts,tsx}',
        'src/platform/packages/shared/kbn-workflows-ui/**/*.{js,mjs,ts,tsx}',
      ],
      rules: {
        'no-duplicate-imports': 'off',
      },
    },

    /**
     * Cloud Security Team overrides
     */
    {
      files: ['x-pack/solutions/security/plugins/cloud_security_posture/**/*.{js,mjs,ts,tsx}'],
      // `testing-library/*` rules run in oxlint (.oxlint/testing_library.mts); registered for `eslint-disable` directives.
      plugins: ['testing-library'],
    },
    /**
     * Code inside .buildkite runs separately from everything else in CI, before bootstrap, with Node. It needs a few tweaks because of this.
     */
    {
      files: '.buildkite/**/*.{cjs,js,mjs,ts}',
      parserOptions: {
        ecmaVersion: 2022,
      },
    },
  ],
};

/**
 * Prettier disables all conflicting rules, listing as last override so it takes precedence
 * people kept ignoring that this was last so it's now defined outside of the overrides list
 */
/** eslint-disable-next-line */
module.exports.overrides.push({ files: ['**/*'], rules: require('eslint-config-prettier').rules });
/** PLEASE DON'T PUT THINGS AFTER THIS */
