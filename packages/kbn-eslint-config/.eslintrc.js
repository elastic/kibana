/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

module.exports = {
  extends: [
    './javascript.js',
    './typescript.js',
    './jest.js',
    './react.js',
    'plugin:@elastic/eui/recommended',
  ],

  plugins: [
    '@kbn/eslint-plugin-disable',
    '@kbn/eslint-plugin-eslint',
    '@kbn/eslint-plugin-imports',
    '@kbn/eslint-plugin-telemetry',
    '@kbn/eslint-plugin-i18n',
    '@kbn/eslint-plugin-alerting-v2',
    '@kbn/eslint-plugin-kbn-ui',
    '@elastic/eui',
    'eslint-plugin-depend',
    'prettier',
  ],

  parserOptions: {
    ecmaVersion: 2018,
  },

  env: {
    es6: true,
  },

  rules: {
    // Suggests better replacements for packages: https://github.com/es-tooling/module-replacements/tree/main/docs/modules
    'depend/ban-dependencies': [
      'error',
      {
        allowed: [
          '^@kbn/*', // internal packages
          'lodash', // https://github.com/es-tooling/module-replacements/blob/main/docs/modules/lodash-underscore.md
          'moment', // https://github.com/es-tooling/module-replacements/blob/main/docs/modules/momentjs.md
          'jquery', // https://github.com/es-tooling/module-replacements/blob/main/docs/modules/jquery.md
        ],
      },
    ],

    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
    ],

    /**
     * ESLint rule to aid with breaking up packages:
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

    '@kbn/disable/no_protected_eslint_disable': 'error',
    '@kbn/disable/no_naked_eslint_disable': 'error',
    '@kbn/eslint/no_unsafe_hash': 'error',
    '@kbn/imports/no_unresolvable_imports': 'error',
    '@kbn/imports/uniform_imports': 'error',
    '@kbn/imports/no_unused_imports': 'error',
    '@kbn/imports/no_boundary_crossing': 'error',
    '@kbn/imports/no_group_crossing_manifests': 'error',
    '@kbn/imports/no_group_crossing_imports': 'error',
    '@kbn/imports/no_direct_handlebars_import': 'error',
    '@kbn/imports/no_direct_monaco_import': 'warn',
    '@kbn/imports/no_undeclared_plugin_target': 'error',
    'no-new-func': 'error',
    'no-implied-eval': 'error',
    'no-prototype-builtins': 'error',

    /**
     * kbn-ui rules
     */
    '@kbn/kbn-ui/prefer_toast_action_props': 'warn',
    '@kbn/kbn-ui/prefer_kbn_ui_callout': 'warn',
    '@kbn/kbn-ui/no_restricted_package_imports': 'error',

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
  },

};
