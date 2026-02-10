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

import { createRequire } from 'module';
import { fixupPluginRules } from '@eslint/compat';
import dependPlugin from 'eslint-plugin-depend';
import prettierPlugin from 'eslint-plugin-prettier';

const require = createRequire(import.meta.url);

// Bootstrap Kibana's custom module resolution hooks when they aren't already
// active (e.g. when the ESLint IDE extension loads the config directly rather
// than going through scripts/eslint.ts which loads @kbn/setup-node-env first).
try {
  require.resolve('@kbn/eslint-plugin-disable');
} catch {
  // Use a relative path so this works without the hooks being active yet.
  // base.mjs lives at packages/kbn-eslint-config/flat/ → ../../../src/setup_node_env
  require('../../../src/setup_node_env');
}

const { USES_STYLED_COMPONENTS } = require('@kbn/babel-preset/styled_components_files');
const kbnDisablePlugin = require('@kbn/eslint-plugin-disable');
const kbnEslintPlugin = require('@kbn/eslint-plugin-eslint');
const kbnImportsPlugin = require('@kbn/eslint-plugin-imports');
const kbnTelemetryPlugin = require('@kbn/eslint-plugin-telemetry');
const kbnI18nPlugin = require('@kbn/eslint-plugin-i18n');
const euiPlugin = require('@elastic/eslint-plugin-eui');

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    plugins: {
      '@kbn/disable': fixupPluginRules(kbnDisablePlugin),
      '@kbn/eslint': fixupPluginRules(kbnEslintPlugin),
      '@kbn/imports': fixupPluginRules(kbnImportsPlugin),
      '@kbn/telemetry': fixupPluginRules(kbnTelemetryPlugin),
      '@kbn/i18n': fixupPluginRules(kbnI18nPlugin),
      '@elastic/eui': fixupPluginRules(euiPlugin),
      depend: dependPlugin,
      prettier: prettierPlugin,
    },
    languageOptions: {
      ecmaVersion: 2018,
    },
    rules: {
      // Suggests better replacements for packages
      'depend/ban-dependencies': [
        'error',
        {
          allowed: ['^@kbn/*', 'lodash', 'moment', 'jquery', 'chalk', 'js-yaml'],
        },
      ],

      'prettier/prettier': ['error', { endOfLine: 'auto' }],

      '@kbn/eslint/module_migration': [
        'error',
        [
          { from: 'expect.js', to: '@kbn/expect' },
          {
            from: 'mkdirp',
            to: false,
            disallowedMessage: `Don't use 'mkdirp', use the new { recursive: true } option of Fs.mkdir instead`,
          },
          { from: 'numeral', to: '@elastic/numeral' },
          {
            from: '@kbn/elastic-idx',
            to: false,
            disallowedMessage: `Don't use idx(), use optional chaining syntax instead https://ela.st/optchain`,
          },
          { from: 'x-pack', toRelative: 'x-pack' },
          { from: 'react-router', to: 'react-router-dom' },
          { from: '@kbn/ui-shared-deps/monaco', to: '@kbn/monaco' },
          {
            from: 'monaco-editor',
            to: false,
            disallowedMessage: `Don't import monaco directly, use or add exports to @kbn/monaco`,
          },
          {
            from: 'tinymath',
            to: '@kbn/tinymath',
            disallowedMessage: `Don't use 'tinymath', use '@kbn/tinymath'`,
          },
          {
            from: '@kbn/test/types/ftr',
            to: '@kbn/test',
            disallowedMessage: `import from the root of @kbn/test instead`,
          },
          {
            from: 'react-intl',
            to: '@kbn/i18n-react',
            disallowedMessage: `import from @kbn/i18n-react instead`,
            exclude: [/src[/\\]platform[/\\]packages[/\\]shared[/\\]kbn-i18n-react/],
          },
          {
            from: 'zod',
            to: '@kbn/zod',
            disallowedMessage: `import from @kbn/zod instead`,
            exclude: [/src[/\\]platform[/\\]packages[/\\]shared[/\\]kbn-zod[/\\]/],
          },
          {
            from: 'styled-components',
            to: false,
            exclude: USES_STYLED_COMPONENTS,
            disallowedMessage: `Prefer using @emotion/react instead. To use styled-components, ensure you plugin is enabled in packages/kbn-babel-preset/styled_components_files.js.`,
          },
          {
            from: '@kbn/test/jest',
            to: '@kbn/test-jest-helpers',
            disallowedMessage: `import from @kbn/test-jest-helpers instead`,
          },
          {
            from: '@kbn/utility-types/jest',
            to: '@kbn/utility-types-jest',
            disallowedMessage: `import from @kbn/utility-types-jest instead`,
          },
          { from: '@kbn/inspector-plugin', to: '@kbn/inspector-plugin/common', exact: true },
          { from: '@kbn/expressions-plugin', to: '@kbn/expressions-plugin/common', exact: true },
          {
            from: '@kbn/kibana-utils-plugin',
            to: '@kbn/kibana-utils-plugin/common',
            exact: true,
          },
          { from: '@elastic/safer-lodash-set', to: '@kbn/safer-lodash-set' },
          { from: '@elastic/apm-synthtrace', to: '@kbn/synthtrace' },
          { from: 'rison-node', to: '@kbn/rison' },
          {
            from: 'react-dom/client',
            to: 'react-dom',
            exact: true,
            disallowedMessage:
              'Use `react-dom` instead of `react-dom/client` until upgraded to React 18',
          },
          {
            from: '@tanstack/react-query',
            to: '@kbn/react-query',
            exact: true,
            disallowedMessage:
              'Use `@kbn/react-query` instead of `@tanstack/react-query`, as it defaults to networkMode="always"',
          },
        ],
      ],

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
          { from: '@kbn/dev-utils', to: '@kbn/ci-stats-core', exportNames: ['Config'] },
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
              'CommandRunFn',
              'FlagOptions',
              'Flags',
              'RunContext',
              'RunFn',
              'RunOptions',
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
      '@kbn/eslint/no_async_promise_body': 'error',
      '@kbn/eslint/no_async_foreach': 'error',
      '@kbn/eslint/require_kibana_feature_privileges_naming': 'warn',
      '@kbn/eslint/no_trailing_import_slash': 'error',
      '@kbn/eslint/no_constructor_args_in_property_initializers': 'error',
      '@kbn/eslint/no_this_in_property_initializers': 'error',
      '@kbn/eslint/no_unsafe_console': 'error',
      '@kbn/eslint/no_unsafe_hash': 'error',
      '@kbn/imports/no_unresolvable_imports': 'error',
      '@kbn/imports/uniform_imports': 'error',
      '@kbn/imports/no_unused_imports': 'error',
      '@kbn/imports/no_boundary_crossing': 'error',
      '@kbn/imports/no_group_crossing_manifests': 'error',
      '@kbn/imports/no_group_crossing_imports': 'error',
      '@kbn/imports/no_direct_handlebars_import': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',
      'no-prototype-builtins': 'error',

      '@elastic/eui/no-restricted-eui-imports': [
        'warn',
        {
          patterns: ['@kbn/ui-theme'],
          message: 'For client-side, please use `useEuiTheme` instead.',
        },
      ],
    },
  },
];
