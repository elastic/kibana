/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DummyRuleMap, OxlintOverride } from 'oxlint';

const importsRules: DummyRuleMap = {
  /**
   * Rule to aid with breaking up packages:
   *
   *  `from` the package/request where the exports used to be
   *  `to` the package/request where the exports are now
   *  `exportNames` the list of exports which used to be found in `from` and are now found in `to`
   *
   * TODO(@spalger): once packages have types we should be able to filter this rule based on the package type
   *  of the file being linted so that we could re-route imports from `plugin-client` types to a different package
   *  than `plugin-server` types.
   */
  '@kbn/imports/exports_moved_packages': [
    'error',
    [
      {
        from: '@kbn/dev-utils',
        to: '@kbn/tooling-log',
        exportNames: [
          'DEFAULT_LOG_LEVEL',
          'getLogLevelFlagsHelp',
          'LOG_LEVEL_FLAGS',
          'LogLevel',
          'Message',
          'ParsedLogLevel',
          'parseLogLevel',
          'pickLevelFromFlags',
          'ToolingLog',
          'ToolingLogCollectingWriter',
          'ToolingLogOptions',
          'ToolingLogTextWriter',
          'ToolingLogTextWriterConfig',
          'Writer',
        ],
      },
      {
        from: '@kbn/dev-utils',
        to: '@kbn/ci-stats-reporter',
        exportNames: [
          'CiStatsMetric',
          'CiStatsReporter',
          'CiStatsReportTestsOptions',
          'CiStatsTestGroupInfo',
          'CiStatsTestResult',
          'CiStatsTestRun',
          'CiStatsTestType',
          'CiStatsTiming',
          'getTimeReporter',
          'MetricsOptions',
          'TimingsOptions',
        ],
      },
      {
        from: '@kbn/dev-utils',
        to: '@kbn/ci-stats-core',
        exportNames: ['Config'],
      },
      {
        from: '@kbn/dev-utils',
        to: '@kbn/jest-serializers',
        exportNames: [
          'createAbsolutePathSerializer',
          'createStripAnsiSerializer',
          'createRecursiveSerializer',
          'createAnyInstanceSerializer',
          'createReplaceSerializer',
        ],
      },
      {
        from: '@kbn/dev-utils',
        to: '@kbn/stdio-dev-helpers',
        exportNames: ['observeReadable', 'observeLines'],
      },
      {
        from: '@kbn/dev-utils',
        to: '@kbn/sort-package-json',
        exportNames: ['sortPackageJson'],
      },
      {
        from: '@kbn/dev-utils',
        to: '@kbn/dev-cli-runner',
        exportNames: [
          'run',
          'Command',
          'RunWithCommands',
          'CleanupTask',
          'Command',
          'CommandRunFn',
          'FlagOptions',
          'Flags',
          'RunContext',
          'RunFn',
          'RunOptions',
          'RunWithCommands',
          'RunWithCommandsOptions',
          'getFlags',
          'mergeFlagOptions',
        ],
      },
      {
        from: '@kbn/dev-utils',
        to: '@kbn/dev-cli-errors',
        exportNames: ['createFailError', 'createFlagError', 'isFailError'],
      },
      {
        from: '@kbn/dev-utils',
        to: '@kbn/dev-proc-runner',
        exportNames: ['withProcRunner', 'ProcRunner'],
      },
      {
        from: '@kbn/utils',
        to: '@kbn/repo-info',
        exportNames: [
          'REPO_ROOT',
          'UPSTREAM_BRANCH',
          'kibanaPackageJson',
          'isKibanaDistributable',
          'fromRoot',
        ],
      },
      {
        from: '@kbn/presentation-util-plugin/common',
        to: '@kbn/presentation-util-plugin/test_helpers',
        exportNames: ['functionWrapper', 'fontStyle'],
      },
      {
        from: '@kbn/fleet-plugin/common',
        to: '@kbn/fleet-plugin/common/mocks',
        exportNames: ['createFleetAuthzMock'],
      },
    ],
  ],
  '@kbn/imports/no_unresolvable_imports': 'error',
  '@kbn/imports/uniform_imports': 'error',
  '@kbn/imports/no_unused_imports': 'error',
  '@kbn/imports/no_boundary_crossing': 'error',
  '@kbn/imports/no_group_crossing_manifests': 'error',
  '@kbn/imports/no_group_crossing_imports': 'error',
  '@kbn/imports/no_direct_handlebars_import': 'error',
  '@kbn/imports/no_direct_monaco_import': 'warn',
  '@kbn/imports/no_undeclared_plugin_target': 'error',
};

const EVALS_SUITES_DIR = 'x-pack/solutions/security/packages';

export const importsOverrides: OxlintOverride[] = [
  {
    // ESLint ran these rules on the extensions it lints; keep them off `.cjs`, `.mts`, etc.
    files: ['**/*.{js,mjs,ts,tsx}'],
    rules: importsRules,
  },
  {
    // Code inside .buildkite runs separately from everything else in CI, before bootstrap, with Node.
    // ESLint never linted the `.cjs` files that its `.buildkite/**/*.{cjs,js,mjs,ts}` override matched.
    files: ['.buildkite/**/*.{js,mjs,ts}'],
    rules: {
      '@kbn/imports/no_unresolvable_imports': 'off',
      '@kbn/imports/uniform_imports': ['error', { preserveFileExtensions: true }],
    },
  },
  {
    files: [
      // TODO @kibana/operations
      'scripts/create_observability_rules.js', // is importing "@kbn/observability-alerting-test-data" (observability/private)
      'scripts/capture_sigevents_env_snapshot.js',
      'scripts/capture_sigevents_otel_demo_snapshots.js',
      'scripts/probe_sigevents_eval_snapshot.js',
      'scripts/replay_sigevents_eval_snapshot.js',
      'scripts/restore_sigevents_env_snapshot.js',
      'scripts/seed_sigevents_env.js',
      'src/cli_setup/**', // is importing "@kbn/interactive-setup-plugin" (platform/private)
      'src/dev/build/tasks/install_chromium.ts', // is importing "@kbn/screenshotting-plugin" (platform/private)*',

      // For now, we keep the exception to let tests depend on anything.
      // Ideally, we need to classify the solution specific ones to reduce CI times
      'x-pack/platform/test/plugin_functional/plugins/resolver_test/**',
    ],
    rules: {
      '@kbn/imports/no_group_crossing_manifests': 'warn',
      '@kbn/imports/no_group_crossing_imports': 'warn',
    },
  },
  {
    files: ['packages/kbn-dependency-usage/**/*.{ts,tsx}'],
    rules: {
      // disabling it since package is marked as module and it requires extension for files written
      '@kbn/imports/uniform_imports': 'off',
    },
  },
  {
    // functional-tests packages intentionally import from test-helper packages (e.g. @kbn/evals, @kbn/scout)
    files: [
      `${EVALS_SUITES_DIR}/kbn-evals-suite-alert-analysis-workflow/**/*.{js,mjs,ts,tsx}`,
      `${EVALS_SUITES_DIR}/kbn-evals-suite-attack-discovery-fp-tp/**/*.{js,mjs,ts,tsx}`,
      `${EVALS_SUITES_DIR}/kbn-evals-suite-security-alert-triage/**/*.{js,mjs,ts,tsx}`,
    ],
    rules: {
      '@kbn/imports/no_boundary_crossing': 'off',
    },
  },
  {
    // Plain CJS scripts use Node built-ins via require() which the import
    // resolver cannot statically resolve — disable the unresolvable rule.
    files: [`${EVALS_SUITES_DIR}/kbn-evals-suite-lead-generation/scripts/**/*.js`],
    rules: {
      '@kbn/imports/no_unresolvable_imports': 'off',
    },
  },
  {
    files: ['x-pack/platform/packages/shared/ai-infra/anonymization-common/**/*.gen.ts'],
    rules: {
      '@kbn/imports/no_unused_imports': 'off',
    },
  },
  {
    files: [
      'x-pack/platform/plugins/shared/inference/scripts/evaluation/**/*.spec.ts',
      'x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/**/*.spec.ts',
    ],
    rules: {
      '@kbn/imports/require_import': ['error', '@kbn/ambient-ftr-types'],
    },
  },
  {
    /**
     * Redux Toolkit v1 enforcement.
     * These paths still use RTK v1 aliased packages (redux-toolkit-v1, react-redux-v7, etc.).
     * When a plugin/package migrates to RTK v2, remove its entry here.
     * See dev_docs/contributing/redux_toolkit_v1_v2_migration.mdx
     */
    files: [
      'src/platform/packages/private/kbn-ambient-common-types/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-coloring/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-test-jest-helpers/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-lens-embeddable-utils/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/shared-ux/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/data_view_management/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/expressions/**/*.{js,mjs,ts,tsx,d.ts}',
      'src/platform/plugins/shared/unified_doc_viewer/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/workflows_management/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/private/canvas/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/private/cross_cluster_replication/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/private/monitoring/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/private/remote_clusters/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/private/rollup/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/agent_builder/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/content_connectors/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/fleet/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/index_management/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/lens/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/license_management/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/maps/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/osquery/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/searchprofiler/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/streams_app/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/plugins/apm/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/plugins/synthetics/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/plugins/uptime/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/search/plugins/enterprise_search/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/packages/data-table/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/packages/expandable-flyout/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/timelines/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      '@kbn/imports/no_redux_toolkit_v2_imports': 'error',
    },
  },
];
