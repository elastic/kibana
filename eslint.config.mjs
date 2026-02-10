/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Flat config helpers
import { FlatCompat } from '@eslint/eslintrc';
import { fixupPluginRules } from '@eslint/compat';
import js from '@eslint/js';
import globals from 'globals';

// Modular configs from kbn-eslint-config
import baseConfig from './packages/kbn-eslint-config/flat/base.mjs';
import jsConfig from './packages/kbn-eslint-config/flat/javascript.mjs';
import tsConfig from './packages/kbn-eslint-config/flat/typescript.mjs';
import jestConfig from './packages/kbn-eslint-config/flat/jest.mjs';
import reactConfig from './packages/kbn-eslint-config/flat/react.mjs';

// Prettier (must be last)
import prettierConfig from 'eslint-config-prettier';

// Plugins used in specific overrides
import formatjsPlugin from 'eslint-plugin-formatjs';
import testingLibraryPlugin from 'eslint-plugin-testing-library';
import mochaPlugin from 'eslint-plugin-mocha';
import playwrightPlugin from 'eslint-plugin-playwright';
import reactPerfPlugin from 'eslint-plugin-react-perf';
import cypressPlugin from 'eslint-plugin-cypress';
import nodePlugin from 'eslint-plugin-node';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import jestPlugin from 'eslint-plugin-jest';
import oxlintPlugin from 'eslint-plugin-oxlint';


// Sanitize globals keys – the `globals` package ships entries like
// "AudioWorkletGlobalScope " that contain trailing whitespace which
// ESLint 9 rejects.
const sanitize = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.trim(), v]));

// Path setup for createRequire and FlatCompat
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// FlatCompat for legacy-style extends
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

// Kibana-specific packages (loaded via require hooks)
const { getPackages } = require('@kbn/repo-packages');
const { REPO_ROOT } = require('@kbn/repo-info');

// ============================================================================
// License Headers
// ============================================================================

const APACHE_2_0_LICENSE_HEADER = `
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
`;

const DUAL_ELV1_SSPL1_LICENSE_HEADER = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
`;

const DUAL_ELV2_SSPL1_LICENSE_HEADER = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
`;

const TRIPLE_ELV2_SSPL1_AGPL3_LICENSE_HEADER = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
`;

const OLD_ELASTIC_LICENSE_HEADER = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
`;

const ELV2_LICENSE_HEADER = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
`;

const SAFER_LODASH_SET_HEADER = `
/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See \`src/platform/packages/shared/kbn-safer-lodash-set/LICENSE\` for more information.
 */
`;

const SAFER_LODASH_SET_LODASH_HEADER = `
/*
 * This file is forked from the lodash project (https://lodash.com/),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See \`src/platform/packages/shared/kbn-safer-lodash-set/LICENSE\` for more information.
 */
`;

const SAFER_LODASH_SET_DEFINITELYTYPED_HEADER = `
/*
 * This file is forked from the DefinitelyTyped project (https://github.com/DefinitelyTyped/DefinitelyTyped),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See \`src/platform/packages/shared/kbn-safer-lodash-set/LICENSE\` for more information.
 */
`;

const KBN_HANDLEBARS_HEADER = `
/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See \`src/platform/packages/private/kbn-handlebars/LICENSE\` for more information.
 */
`;

const KBN_HANDLEBARS_HANDLEBARS_HEADER = `
/*
  * This file is forked from the handlebars project (https://github.com/handlebars-lang/handlebars.js),
  * and may include modifications made by Elasticsearch B.V.
  * Elasticsearch B.V. licenses this file to you under the MIT License.
  * See \`src/platform/packages/private/kbn-handlebars/LICENSE\` for more information.
  */
`;

const VENN_DIAGRAM_HEADER = `
/*
  * This file is forked from the venn.js project (https://github.com/benfred/venn.js/),
  * and may include modifications made by Elasticsearch B.V.
  * Elasticsearch B.V. licenses this file to you under the MIT License.
  * See \`x-pack/platform/plugins/private/graph/public/components/venn_diagram/vennjs/LICENSE\` for more information.
  */
`;

const ALL_LICENSE_HEADERS = [
  APACHE_2_0_LICENSE_HEADER,
  TRIPLE_ELV2_SSPL1_AGPL3_LICENSE_HEADER,
  DUAL_ELV2_SSPL1_LICENSE_HEADER,
  DUAL_ELV1_SSPL1_LICENSE_HEADER,
  ELV2_LICENSE_HEADER,
  OLD_ELASTIC_LICENSE_HEADER,
  SAFER_LODASH_SET_HEADER,
  SAFER_LODASH_SET_LODASH_HEADER,
  SAFER_LODASH_SET_DEFINITELYTYPED_HEADER,
  KBN_HANDLEBARS_HEADER,
  KBN_HANDLEBARS_HANDLEBARS_HEADER,
  VENN_DIAGRAM_HEADER,
];

// ============================================================================
// Dev Patterns (for import/no-extraneous-dependencies)
// ============================================================================

const DEV_PACKAGE_DIRS = getPackages(REPO_ROOT).flatMap((pkg) =>
  pkg.isDevOnly() ? pkg.normalizedRepoRelativeDir : []
);

const DEV_DIRECTORIES = [
  '.storybook', '__tests__', '__test__', '__jest__', '__fixtures__', '__mocks__', '__stories__',
  'e2e', 'cypress', 'fixtures', 'ftr_e2e', 'integration_tests', 'manual_tests', 'mock', 'mocks',
  'storybook', 'scripts', 'test', 'test-d', 'test_utils', 'test_utilities', 'test_helpers',
  'tests_client_integration', 'tsd_tests',
];

const DEV_FILE_PATTERNS = [
  '*.mock.{js,ts,tsx}', '*.test.{js,ts,tsx}', '*.test.helpers.{js,ts,tsx}',
  '*.stories.{js,ts,tsx}', '*.story.{js,ts,tsx}', '*.stub.{js,ts,tsx}',
  'mock.{js,ts,tsx}', '_stubs.{js,ts,tsx}', '{testHelpers,test_helper,test_utils}.{js,ts,tsx}',
  '{postcss,webpack,cypress}.config.{js,ts}',
];

const DEV_PATTERNS = [
  ...DEV_PACKAGE_DIRS.map((pkg) => `${pkg}/**/*`),
  ...DEV_DIRECTORIES.map((dir) => `{packages,src,x-pack}/**/${dir}/**/*`),
  ...DEV_FILE_PATTERNS.map((file) => `{packages,src,x-pack}/**/${file}`),
  'src/platform/packages/shared/kbn-interpreter/tasks/**/*',
  'src/dev/**/*',
  'x-pack/{dev-tools,tasks,test,build_chromium}/**/*',
  'x-pack/performance/**/*',
  'src/setup_node_env/index.js',
  'src/cli/dev.js',
  'src/platform/packages/shared/kbn-esql-language/scripts/**/*',
];

// ============================================================================
// Restricted Imports
// ============================================================================

const RESTRICTED_IMPORTS = [
  {
    name: 'lodash',
    importNames: ['set', 'setWith', 'template'],
    message:
      'lodash.set/setWith: Please use @kbn/safer-lodash-set instead.\n' +
      'lodash.template: Function is unsafe, and not compatible with our content security policy.',
  },
  { name: 'lodash.set', message: 'Please use @kbn/safer-lodash-set/set instead' },
  { name: 'lodash.setwith', message: 'Please use @kbn/safer-lodash-set/setWith instead' },
  { name: 'lodash/set', message: 'Please use @kbn/safer-lodash-set/set instead' },
  { name: 'lodash/setWith', message: 'Please use @kbn/safer-lodash-set/setWith instead' },
  {
    name: 'lodash/fp',
    importNames: ['set', 'setWith', 'assoc', 'assocPath', 'template'],
    message:
      'lodash.set/setWith/assoc/assocPath: Please use @kbn/safer-lodash-set/fp instead\n' +
      'lodash.template: Function is unsafe, and not compatible with our content security policy.',
  },
  { name: 'lodash/fp/set', message: 'Please use @kbn/safer-lodash-set/fp/set instead' },
  { name: 'lodash/fp/setWith', message: 'Please use @kbn/safer-lodash-set/fp/setWith instead' },
  { name: 'lodash/fp/assoc', message: 'Please use @kbn/safer-lodash-set/fp/assoc instead' },
  { name: 'lodash/fp/assocPath', message: 'Please use @kbn/safer-lodash-set/fp/assocPath instead' },
  { name: 'lodash.template', message: 'lodash.template is unsafe, and not compatible with our content security policy.' },
  { name: 'lodash/template', message: 'lodash.template is unsafe, and not compatible with our content security policy.' },
  { name: 'lodash/fp/template', message: 'lodash.template is unsafe, and not compatible with our content security policy.' },
  { name: 'react-use', message: 'Please use react-use/lib/{method} instead.' },
  { name: 'react-use/lib', message: 'Please use react-use/lib/{method} instead.' },
  {
    name: 'react-router-dom',
    importNames: ['Router', 'Switch', 'Route'],
    message: 'Please use @kbn/shared-ux-router instead',
  },
  {
    name: '@kbn/kibana-react-plugin/public',
    importNames: ['Route'],
    message: 'Please use @kbn/shared-ux-router instead',
  },
  {
    name: 'rxjs/operators',
    message: 'Please, use rxjs instead: rxjs/operators is just a subset, unnecessarily duplicating the package import.',
  },
  { name: '@testing-library/react-hooks', message: 'Please use @testing-library/react instead' },
  ...[
    'Alt', 'Alternative', 'Applicative', 'Apply', 'Array', 'Bifunctor', 'boolean', 'BooleanAlgebra',
    'Bounded', 'BoundedDistributiveLattice', 'BoundedJoinSemilattice', 'BoundedLattice',
    'BoundedMeetSemilattice', 'Category', 'Chain', 'ChainRec', 'Choice', 'Comonad', 'Compactable',
    'Console', 'Const', 'Contravariant', 'Date', 'DistributiveLattice', 'Either', 'EitherT', 'Eq',
    'Extend', 'Field', 'Filterable', 'FilterableWithIndex', 'Foldable', 'FoldableWithIndex',
    'function', 'Functor', 'FunctorWithIndex', 'Group', 'HeytingAlgebra', 'Identity', 'Invariant',
    'IO', 'IOEither', 'IORef', 'JoinSemilattice', 'Lattice', 'Magma', 'Map', 'MeetSemilattice',
    'Monad', 'MonadIO', 'MonadTask', 'MonadThrow', 'Monoid', 'NonEmptyArray', 'Option', 'OptionT',
    'Ord', 'Ordering', 'pipeable', 'Profunctor', 'Random', 'Reader', 'ReaderEither', 'ReaderT',
    'ReaderTask', 'ReaderTaskEither', 'ReadonlyArray', 'ReadonlyMap', 'ReadonlyNonEmptyArray',
    'ReadonlyRecord', 'ReadonlySet', 'ReadonlyTuple', 'Record', 'Ring', 'Semigroup', 'Semigroupoid',
    'Semiring', 'Set', 'Show', 'State', 'StateReaderTaskEither', 'StateT', 'Store', 'Strong',
    'Task', 'TaskEither', 'TaskThese', 'These', 'TheseT', 'Traced', 'Traversable',
    'TraversableWithIndex', 'Tree', 'Tuple', 'Unfoldable', 'ValidationT', 'Witherable', 'Writer',
    'WriterT',
  ].map((subset) => ({
    name: `fp-ts/lib/${subset}`,
    message: `Please, use fp-ts/${subset} to avoid duplicating the package import`,
  })),
  { name: 'fp-ts/lib', message: 'Please, use fp-ts to avoid duplicating the package import' },
];

const DEPRECATED_IMPORTS = [
  {
    name: 'enzyme',
    message: 'Enzyme is deprecated and no longer maintained. Please use @testing-library/react instead.',
  },
];

// ============================================================================
// Enzyme restriction (for Security Solution directories migrating away from enzyme)
// ============================================================================

const ENZYME_RESTRICTION = {
  name: 'enzyme',
  message: 'Please use @testing-library/react instead',
};

// Directories that have enzyme restrictions
const ENZYME_SECURITY_DIRS = [
  'x-pack/solutions/security/plugins/security_solution/public/reports',
  'x-pack/solutions/security/plugins/security_solution/public/overview',
  'x-pack/solutions/security/plugins/security_solution/public/onboarding',
  'x-pack/solutions/security/plugins/security_solution/public/explore',
  'x-pack/solutions/security/plugins/security_solution/public/dashboards',
  'x-pack/solutions/security/plugins/security_solution/public/cases',
  'x-pack/solutions/security/plugins/ecs_data_quality_dashboard',
  'x-pack/solutions/security/packages/upselling',
  'x-pack/solutions/security/packages/side-nav',
  'x-pack/solutions/security/packages/navigation',
  'x-pack/solutions/security/packages/features',
  'x-pack/solutions/security/packages/ecs-data-quality-dashboard',
  'x-pack/solutions/security/packages/connectors',
  'src/platform/packages/shared/kbn-securitysolution-ecs',
  'src/platform/packages/shared/kbn-cell-actions',
];

// Security solution files that are within the front-end no-restricted-imports scope
const SECURITY_SOLUTION_FRONTEND_FILES = [
  'x-pack/solutions/security/plugins/ecs_data_quality_dashboard/common/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/security/plugins/elastic_assistant/common/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/packages/shared/kbn-elastic-assistant/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/packages/shared/kbn-elastic-assistant-common/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/security/packages/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/security/plugins/security_solution/public/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/security/plugins/security_solution_ess/public/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/security/plugins/security_solution_serverless/public/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/security/plugins/security_solution/common/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/security/plugins/security_solution_ess/common/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/security/plugins/security_solution_serverless/common/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/security/plugins/timelines/public/**/*.{js,mjs,ts,tsx}',
  'x-pack/solutions/security/plugins/timelines/common/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/shared/cases/public/**/*.{js,mjs,ts,tsx}',
  'x-pack/platform/plugins/shared/cases/common/**/*.{js,mjs,ts,tsx}',
  'src/platform/packages/shared/kbn-cell-actions/**/*.{js,mjs,ts,tsx}',
];

const SECURITY_SOLUTION_TS_FILES = [
  'x-pack/solutions/security/plugins/ecs_data_quality_dashboard/**/*.{ts,tsx}',
  'x-pack/solutions/security/plugins/elastic_assistant/**/*.{ts,tsx}',
  'x-pack/platform/plugins/shared/automatic_import/**/*.{ts,tsx}',
  'x-pack/platform/packages/shared/kbn-elastic-assistant/**/*.{ts,tsx}',
  'x-pack/platform/packages/shared/kbn-elastic-assistant-common/**/*.{ts,tsx}',
  'x-pack/platform/packages/shared/kbn-langchain/**/*.{ts,tsx}',
  'x-pack/solutions/security/packages/**/*.{ts,tsx}',
  'x-pack/solutions/security/plugins/security_solution/**/*.{ts,tsx}',
  'x-pack/solutions/security/plugins/security_solution_ess/**/*.{ts,tsx}',
  'x-pack/solutions/security/plugins/security_solution_serverless/**/*.{ts,tsx}',
  'x-pack/solutions/security/plugins/timelines/**/*.{ts,tsx}',
  'x-pack/platform/plugins/shared/cases/**/*.{ts,tsx}',
  'src/platform/packages/shared/kbn-cell-actions/**/*.{ts,tsx}',
];

// ============================================================================
// Helper: disallow-license-headers list (all headers except the required one)
// ============================================================================

function disallowHeaders(requiredHeader) {
  return ALL_LICENSE_HEADERS.filter((h) => h !== requiredHeader);
}

// ============================================================================
// The flat config array
// ============================================================================

export default [
  // **************************************************************************
  // 1. Global ignores (replaces .eslintignore)
  // **************************************************************************
  {
    ignores: [
      'eslint.config.mjs',
      '**/*.js.snap',
      '__tmp__/**',
      '.es/**',
      '.chromium/**',
      'build/**',
      'built_assets/**',
      'config/apm.dev.js',
      'data/**',
      'html_docs/**',
      'optimize/**',
      'plugins/**',
      'test/fixtures/scenarios/**',
      'x-pack/build/**',
      '**/node_modules/**',
      '**/target/**',
      '**/snapshots.js',
      // plugin overrides
      'src/platform/plugins/shared/data/common/es_query/kuery/ast/_generated_/**',
      'x-pack/platform/plugins/private/canvas/canvas_plugin/**',
      'x-pack/platform/plugins/private/reporting/server/export_types/printable_pdf/server/lib/pdf/assets/**',
      'x-pack/platform/plugins/private/reporting/server/export_types/printable_pdf_v2/server/lib/pdf/assets/**',
      'x-pack/platform/plugins/private/cloud_integrations/cloud_full_story/public/assets/**',
      // package overrides
      'packages/kbn-eslint-config/**',
      'packages/kbn-plugin-generator/template/**',
      'packages/kbn-generate/templates/**',
      'src/platform/packages/shared/kbn-test/src/functional_test_runner/__tests__/fixtures/**',
      'src/platform/packages/shared/kbn-test/src/functional_test_runner/lib/config/__tests__/fixtures/**',
      'src/platform/packages/shared/kbn-flot-charts/lib/**',
      'src/platform/packages/shared/kbn-monaco/src/**/antlr/**',
      'src/platform/packages/shared/kbn-esql-language/src/parser/antlr/**',
      'src/platform/packages/shared/kbn-workflows/spec/elasticsearch/generated/**',
      'src/platform/packages/shared/kbn-workflows/spec/kibana/generated/**',
      'x-pack/platform/plugins/shared/screenshotting/chromium/**',
    ],
  },

  // **************************************************************************
  // 2. Base configs (shared plugins + rules, JS, TS, Jest, React)
  // **************************************************************************
  ...baseConfig,
  ...jsConfig,
  ...tsConfig,
  ...jestConfig,
  ...reactConfig,

  // **************************************************************************
  // 2b. Global plugin declarations for override blocks below.
  //     In flat config, plugins must be declared in a config object that matches
  //     the file being linted.  The base configs above only match *.js / *.ts etc.
  //     This catch-all block re-exports the *same* plugin object references so
  //     override-specific config objects can use any plugin rule without having
  //     to redeclare the plugin themselves.
  // **************************************************************************
  {
    plugins: {
      // Reuse exact references from sub-configs to avoid "Cannot redefine" errors
      ...(jsConfig[0]?.plugins || {}),
      ...(tsConfig[0]?.plugins || {}),
      ...(jestConfig[0]?.plugins || {}),
      ...(reactConfig[0]?.plugins || {}),
      ...(baseConfig[0]?.plugins || {}),
    },
  },

  // **************************************************************************
  // 3. EUI recommended rules
  // **************************************************************************
  {
    rules: {
      '@elastic/eui/accessible-interactive-element': 'warn',
      '@elastic/eui/callout-announce-on-mount': 'warn',
      '@elastic/eui/consistent-is-invalid-props': 'warn',
      '@elastic/eui/href-or-on-click': 'warn',
      '@elastic/eui/no-css-color': 'warn',
      '@elastic/eui/no-restricted-eui-imports': 'warn',
      '@elastic/eui/no-static-z-index': 'warn',
      '@elastic/eui/no-unnamed-interactive-element': 'warn',
      '@elastic/eui/no-unnamed-radio-group': 'warn',
      '@elastic/eui/prefer-eui-icon-tip': 'warn',
      '@elastic/eui/require-aria-label-for-modals': 'warn',
      '@elastic/eui/require-table-caption': 'warn',
      '@elastic/eui/sr-output-disabled-tooltip': 'warn',
      '@elastic/eui/tooltip-focusable-anchor': 'warn',
      '@elastic/eui/badge-accessibility-rules': 'warn',
      '@elastic/eui/icon-accessibility-rules': 'warn',
    },
  },

  // **************************************************************************
  // 4. Root overrides
  // **************************************************************************

  /**
   * .mts files - ES module TypeScript files
   */
  {
    files: ['**/*.mts'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      sourceType: 'module',
      ecmaVersion: 2020,
    },
  },

  /**
   * Vitest test files - enable vitest globals
   */
  {
    files: ['**/*.test.{ts,tsx}', '**/vitest.config.{ts,mts}'],
    rules: {
      'no-undef': 'off',
    },
  },

  /**
   * Temporarily disable some react rules for specific plugins
   */
  {
    files: ['src/platform/plugins/shared/kibana_react/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    files: ['src/platform/plugins/shared/kibana_utils/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    files: ['x-pack/platform/plugins/private/canvas/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'jsx-a11y/click-events-have-key-events': 'off',
    },
  },
  {
    files: ['x-pack/platform/plugins/private/cross_cluster_replication/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'jsx-a11y/click-events-have-key-events': 'off',
    },
  },

  /**
   * FormatJS linter for i18n code
   */
  {
    files: [
      'src/**/*.{js,mjs,ts,tsx}',
      'x-pack/**/*.{js,mjs,ts,tsx}',
      'packages/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/**/*.{js,mjs,ts,tsx}',
      'src/core/packages/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/*/packages/**/*.{js,mjs,ts,tsx}',
    ],
    plugins: {
      formatjs: formatjsPlugin,
    },
    rules: {
      'formatjs/enforce-default-message': ['error', 'anything'],
      'formatjs/enforce-description': 'off',
    },
  },

  /**
   * Files that require triple-license headers (default)
   */
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    rules: {
      '@kbn/eslint/require-license-header': ['error', { license: TRIPLE_ELV2_SSPL1_AGPL3_LICENSE_HEADER }],
      '@kbn/eslint/disallow-license-headers': ['error', { licenses: disallowHeaders(TRIPLE_ELV2_SSPL1_AGPL3_LICENSE_HEADER) }],
    },
  },

  /**
   * Files that require Apache headers
   */
  {
    files: [
      'packages/kbn-eslint-config/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-datemath/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      '@kbn/eslint/require-license-header': ['error', { license: APACHE_2_0_LICENSE_HEADER }],
      '@kbn/eslint/disallow-license-headers': ['error', { licenses: disallowHeaders(APACHE_2_0_LICENSE_HEADER) }],
    },
  },

  /**
   * New Platform client-side
   */
  {
    files: ['{src,x-pack}/plugins/*/public/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'import/no-commonjs': 'error',
    },
  },

  /**
   * Files that require Elastic license headers (x-pack)
   */
  {
    files: ['x-pack/**/*.{js,mjs,ts,tsx}'],
    rules: {
      '@kbn/eslint/require-license-header': ['error', { license: ELV2_LICENSE_HEADER }],
      '@kbn/eslint/disallow-license-headers': ['error', { licenses: disallowHeaders(ELV2_LICENSE_HEADER) }],
    },
  },

  /**
   * safer-lodash-set package requires special license headers
   */
  {
    files: ['src/platform/packages/shared/kbn-safer-lodash-set/**/*.{js,mjs,ts,tsx}'],
    rules: {
      '@kbn/eslint/require-license-header': ['error', { license: SAFER_LODASH_SET_LODASH_HEADER }],
      '@kbn/eslint/disallow-license-headers': ['error', { licenses: disallowHeaders(SAFER_LODASH_SET_LODASH_HEADER) }],
    },
  },
  {
    files: ['src/platform/packages/shared/kbn-safer-lodash-set/test/*.{js,mjs,ts,tsx}'],
    rules: {
      '@kbn/eslint/require-license-header': ['error', { license: SAFER_LODASH_SET_HEADER }],
      '@kbn/eslint/disallow-license-headers': ['error', { licenses: disallowHeaders(SAFER_LODASH_SET_HEADER) }],
    },
  },
  {
    files: ['src/platform/packages/shared/kbn-safer-lodash-set/**/*.d.ts'],
    rules: {
      '@kbn/eslint/require-license-header': ['error', { license: SAFER_LODASH_SET_DEFINITELYTYPED_HEADER }],
      '@kbn/eslint/disallow-license-headers': ['error', { licenses: disallowHeaders(SAFER_LODASH_SET_DEFINITELYTYPED_HEADER) }],
    },
  },

  /**
   * @kbn/handlebars package requires special license headers
   */
  {
    files: ['src/platform/packages/private/kbn-handlebars/**/*.{js,mjs,ts,tsx}'],
    rules: {
      '@kbn/eslint/require-license-header': ['error', { license: KBN_HANDLEBARS_HEADER }],
      '@kbn/eslint/disallow-license-headers': ['error', { licenses: disallowHeaders(KBN_HANDLEBARS_HEADER) }],
    },
  },
  {
    files: ['src/platform/packages/private/kbn-handlebars/src/spec/**/*.{js,mjs,ts,tsx}'],
    rules: {
      '@kbn/eslint/require-license-header': ['error', { license: KBN_HANDLEBARS_HANDLEBARS_HEADER }],
      '@kbn/eslint/disallow-license-headers': ['error', { licenses: disallowHeaders(KBN_HANDLEBARS_HANDLEBARS_HEADER) }],
    },
  },

  /**
   * venn.js fork requires special license headers
   */
  {
    files: ['x-pack/platform/plugins/private/graph/public/components/venn_diagram/vennjs/**/*.{js,mjs,ts,tsx}'],
    rules: {
      '@kbn/eslint/require-license-header': ['error', { license: VENN_DIAGRAM_HEADER }],
      '@kbn/eslint/disallow-license-headers': ['error', { licenses: disallowHeaders(VENN_DIAGRAM_HEADER) }],
    },
  },

  /**
   * Allow default exports
   */
  {
    files: [
      '**/*.stories.tsx',
      '**/*.test.js',
      'src/platform/test/*/config.ts',
      'src/platform/test/*/config_open.ts',
      'src/platform/test/*/*.config.ts',
      'src/platform/test/*/{tests,test_suites,apis,apps}/**/*',
      'src/platform/test/server_integration/**/*.ts',
      'x-pack/solutions/observability/plugins/apm/**/*.js',
      'x-pack/platform/test/*/{tests,test_suites,apis,apps}/**/*',
      'x-pack/platform/test/*api_integration*/**/*',
      'x-pack/platform/test/*/*config.*ts',
      'x-pack/solutions/*/test/**/{tests,test_suites,apis,apps,fixtures,index.ts}/**/*',
      'x-pack/solutions/*/test/**/*config*.ts',
      'x-pack/solutions/*/test/**/tests/**/*',
      'x-pack/solutions/*/test/api_integration_deployment_agnostic/*configs/**/*',
      'x-pack/solutions/*/test/alerting_api_integration/**/*',
      'x-pack/solutions/*/test/serverless/*/configs/**/*',
      'x-pack/platform/test/saved_object_api_integration/*/apis/**/*',
      'x-pack/platform/test/ui_capabilities/*/tests/**/*',
      'x-pack/platform/test/upgrade_assistant_integration/**/*',
      '**/cypress.config.{js,ts}',
      'x-pack/platform/test/serverless/shared/config*.ts',
      'x-pack/platform/test/serverless/*/test_suites/**/*',
      'x-pack/platform/test/serverless/functional/config*.ts',
      'x-pack/platform/test/serverless/*/configs/**/*',
      'x-pack/solutions/security/test/security_solution_api_integration/*/test_suites/**/*',
      'x-pack/solutions/security/test/security_solution_api_integration/**/config*.ts',
      '**/playwright.config.ts',
      '**/parallel.playwright.config.ts',
    ],
    rules: {
      'import/no-default-export': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-named-as-default': 'off',
    },
  },

  /**
   * Single package.json rules
   */
  {
    files: ['{src,x-pack,packages}/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [...DEV_PATTERNS],
          peerDependencies: true,
          packageDir: __dirname,
        },
      ],
    },
  },

  /**
   * Files that run BEFORE node version check
   */
  {
    files: ['scripts/**/*.js', 'src/setup_node_env/**/*.js'],
    rules: {
      'import/no-commonjs': 'off',
      'prefer-object-spread': 'off',
      'no-var': 'off',
      'prefer-const': 'off',
      'prefer-destructuring': 'off',
      'no-restricted-syntax': [
        'error',
        'ImportDeclaration', 'ExportNamedDeclaration', 'ExportDefaultDeclaration',
        'ExportAllDeclaration', 'ArrowFunctionExpression', 'AwaitExpression',
        'ClassDeclaration', 'RestElement', 'SpreadElement', 'YieldExpression',
        'VariableDeclaration[kind="const"]', 'VariableDeclaration[kind="let"]',
        'VariableDeclarator[id.type="ArrayPattern"]', 'VariableDeclarator[id.type="ObjectPattern"]',
      ],
    },
  },

  /**
   * Files that run in the browser with only node-level transpilation
   */
  {
    files: [
      'src/platform/packages/shared/kbn-ftr-common-functional-ui-services/services/web_element_wrapper/scroll_into_view_if_necessary.js',
      '**/browser_exec_scripts/**/*.js',
    ],
    rules: {
      'prefer-object-spread': 'off',
      'no-var': 'off',
      'prefer-const': 'off',
      'prefer-destructuring': 'off',
      'no-restricted-syntax': [
        'error',
        'ArrowFunctionExpression', 'AwaitExpression', 'ClassDeclaration', 'ImportDeclaration',
        'RestElement', 'SpreadElement', 'YieldExpression',
        'VariableDeclaration[kind="const"]', 'VariableDeclaration[kind="let"]',
        'VariableDeclarator[id.type="ArrayPattern"]', 'VariableDeclarator[id.type="ObjectPattern"]',
      ],
    },
  },

  /**
   * Files that run AFTER node version check and are not transpiled with babel
   */
  {
    files: [
      'eslint.config.mjs',
      'packages/kbn-eslint-plugin-eslint/**/*',
      'x-pack/gulpfile.js',
      'x-pack/scripts/*.js',
      '**/jest.config.js',
    ],
    ignores: ['**/integration_tests/**/*'],
    rules: {
      'import/no-commonjs': 'off',
      'prefer-object-spread': 'off',
      'no-restricted-syntax': [
        'error',
        'ImportDeclaration', 'ExportNamedDeclaration', 'ExportDefaultDeclaration', 'ExportAllDeclaration',
      ],
    },
  },

  /**
   * Jest specific rules
   */
  {
    files: ['**/*.test.{js,mjs,ts,tsx}'],
    rules: {
      'jest/valid-describe-callback': 'error',
    },
  },

  /**
   * Harden specific rules
   */
  {
    files: [
      'src/platform/test/harden/*.js',
      'src/platform/packages/shared/kbn-safer-lodash-set/test/*.js',
    ],
    rules: {
      'mocha/handle-done-callback': 'off',
    },
  },

  /**
   * Global restricted imports, modules, and properties
   */
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    rules: {
      '@kbn/eslint/no_wrapped_error_in_logger': 'error',
      'no-restricted-imports': ['error', ...RESTRICTED_IMPORTS],
      '@kbn/eslint/no_deprecated_imports': ['warn', ...DEPRECATED_IMPORTS],
      'no-restricted-modules': [
        'error',
        { name: 'lodash.set', message: 'Please use @kbn/safer-lodash-set instead' },
        { name: 'lodash.setwith', message: 'Please use @kbn/safer-lodash-set instead' },
        { name: 'lodash.template', message: 'lodash.template is unsafe, and not compatible with our content security policy.' },
        { name: 'lodash/set', message: 'Please use @kbn/safer-lodash-set/set instead' },
        { name: 'lodash/setWith', message: 'Please use @kbn/safer-lodash-set/setWith instead' },
        { name: 'lodash/fp/set', message: 'Please use @kbn/safer-lodash-set/fp/set instead' },
        { name: 'lodash/fp/setWith', message: 'Please use @kbn/safer-lodash-set/fp/setWith instead' },
        { name: 'lodash/fp/assoc', message: 'Please use @kbn/safer-lodash-set/fp/assoc instead' },
        { name: 'lodash/fp/assocPath', message: 'Please use @kbn/safer-lodash-set/fp/assocPath instead' },
        { name: 'lodash/fp/template', message: 'lodash.template is unsafe, and not compatible with our content security policy.' },
        { name: 'lodash/template', message: 'lodash.template is unsafe, and not compatible with our content security policy.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'lodash', property: 'set', message: 'Please use @kbn/safer-lodash-set instead' },
        { object: '_', property: 'set', message: 'Please use @kbn/safer-lodash-set instead' },
        { object: 'lodash', property: 'setWith', message: 'Please use @kbn/safer-lodash-set instead' },
        { object: '_', property: 'setWith', message: 'Please use @kbn/safer-lodash-set instead' },
        { object: 'lodash', property: 'assoc', message: 'Please use @kbn/safer-lodash-set instead' },
        { object: '_', property: 'assoc', message: 'Please use @kbn/safer-lodash-set instead' },
        { object: 'lodash', property: 'assocPath', message: 'Please use @kbn/safer-lodash-set instead' },
        { object: '_', property: 'assocPath', message: 'Please use @kbn/safer-lodash-set instead' },
        { object: 'lodash', property: 'template', message: 'lodash.template is unsafe, and not compatible with our content security policy.' },
        { object: '_', property: 'template', message: 'lodash.template is unsafe, and not compatible with our content security policy.' },
      ],
    },
  },

  /**
   * Common/public files get additional semver restriction
   */
  {
    files: ['**/common/**/*.{js,mjs,ts,tsx}', '**/public/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        ...RESTRICTED_IMPORTS,
        { name: 'semver', message: 'Please use "semver/*/{function}" instead' },
      ],
    },
  },

  /**
   * APM, UX and Observability overrides
   */
  {
    files: [
      'x-pack/solutions/observability/plugins/apm/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/plugins/observability/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/plugins/exploratory_view/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/plugins/ux/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/plugins/slo/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/packages/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'no-console': ['warn', { allow: ['error'] }],
      'react/function-component-definition': [
        'warn',
        { namedComponents: 'function-declaration', unnamedComponents: 'arrow-function' },
      ],
      'react-hooks/rules-of-hooks': 'error',
    },
  },
  {
    files: [
      'x-pack/solutions/observability/plugins/apm/**/*.stories.*',
      'x-pack/solutions/observability/plugins/observability/**/*.stories.*',
      'x-pack/solutions/observability/plugins/exploratory_view/**/*.stories.*',
      'x-pack/solutions/observability/plugins/slo/**/*.stories.*',
      'x-pack/solutions/observability/packages/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'react/function-component-definition': [
        'off',
        { namedComponents: 'function-declaration', unnamedComponents: 'arrow-function' },
      ],
    },
  },
  {
    files: [
      'x-pack/platform/plugins/shared/observability_solution/**/*.{ts,tsx}',
      'x-pack/solutions/observability/plugins/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/{streams,streams_app}/**/*.{ts,tsx}',
      'x-pack/solutions/observability/packages/**/*.{ts,tsx}',
    ],
    rules: {
      'react-hooks/exhaustive-deps': [
        'error',
        {
          additionalHooks:
            '^(useUrl|useAbortableAsync|useMemoWithAbortSignal|useFetcher|useProgressiveFetcher|useBreadcrumb|useAsync|useTimeRangeAsync|useAutoAbortedHttpClient|use.*Fetch)$',
        },
      ],
    },
  },
  {
    files: [
      'x-pack/platform/plugins/shared/aiops/**/*.tsx',
      'x-pack/platform/plugins/shared/observability_solution/**/*.{ts,tsx}',
      'x-pack/solutions/observability/plugins/**/*.{ts,tsx}',
      'src/platform/plugins/shared/ai_assistant_management/**/*.tsx',
      'x-pack/solutions/observability/packages/**/*.{ts,tsx}',
    ],
    rules: {
      '@kbn/telemetry/event_generating_elements_should_be_instrumented': 'error',
    },
  },
  {
    files: ['x-pack/solutions/search/**/*.tsx'],
    rules: {
      '@kbn/telemetry/event_generating_elements_should_be_instrumented': 'warn',
    },
  },
  {
    files: [
      'x-pack/solutions/observability/plugins/**/!(*.stories.tsx|*.test.tsx|*.storybook_decorator.tsx|*.mock.tsx)',
      'x-pack/solutions/observability/packages/**/!(*.stories.tsx|*.test.tsx|*.storybook_decorator.tsx|*.mock.tsx)',
      'src/platform/plugins/shared/ai_assistant_management/**/!(*.stories.tsx|*.test.tsx|*.storybook_decorator.tsx|*.mock.tsx)',
      'x-pack/platform/plugins/shared/streams_app/**/!(*.stories.tsx|*.test.tsx|*.storybook_decorator.tsx|*.mock.tsx)',
      'src/platform/packages/shared/kbn-unified-chart-section-viewer/**/!(*.stories.tsx|*.test.tsx|*.storybook_decorator.tsx|*.mock.tsx)',
    ],
    rules: {
      '@kbn/i18n/strings_should_be_translated_with_i18n': 'warn',
      '@kbn/i18n/i18n_translate_should_start_with_the_right_id': 'warn',
      '@kbn/i18n/formatted_message_should_start_with_the_right_id': 'warn',
    },
  },
  {
    files: ['x-pack/solutions/observability/plugins/apm/server/**/route.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': ['error', { allowTypedFunctionExpressions: false }],
    },
  },

  /**
   * Fleet overrides
   */
  {
    files: ['x-pack/platform/plugins/shared/fleet/**/*.{js,mjs,ts,tsx}'],
    plugins: {
      'testing-library': testingLibraryPlugin,
    },
    rules: {
      'testing-library/await-async-utils': 'error',
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent'],
          'newlines-between': 'always-and-inside-groups',
        },
      ],
    },
  },

  /**
   * Integration assistant overrides
   */
  {
    files: [
      'x-pack/platform/plugins/shared/automatic_import/public/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/automatic_import/common/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'import/no-nodejs-modules': 'error',
      'no-duplicate-imports': 'off',
      'import/no-duplicates': 'error',
      'no-restricted-imports': [
        'error',
        { patterns: ['**/server/*'], paths: RESTRICTED_IMPORTS },
      ],
    },
  },

  /**
   * Security Solution overrides
   */
  {
    files: SECURITY_SOLUTION_FRONTEND_FILES,
    rules: {
      'import/no-nodejs-modules': 'error',
      'no-duplicate-imports': 'off',
      'import/no-duplicates': ['error'],
      'no-restricted-imports': [
        'error',
        { patterns: ['**/server/*'], paths: RESTRICTED_IMPORTS },
      ],
    },
  },
  {
    files: ['x-pack/solutions/security/packages/test-api-clients/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'import/no-nodejs-modules': 'off',
    },
  },
  {
    files: SECURITY_SOLUTION_TS_FILES,
    ignores: [
      'x-pack/solutions/security/plugins/ecs_data_quality_dashboard/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/solutions/security/plugins/elastic_assistant/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/platform/plugins/shared/automatic_import/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant-common/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-langchain/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/solutions/security/packages/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_ess/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_serverless/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/solutions/security/plugins/timelines/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/platform/plugins/shared/cases/**/*.{test,mock,test_helper}.{ts,tsx}',
      'src/platform/packages/shared/kbn-cell-actions/**/*.{test,mock,test_helper}.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    files: SECURITY_SOLUTION_TS_FILES,
    rules: {
      '@typescript-eslint/no-this-alias': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/unified-signatures': 'error',
      'no-restricted-imports': [
        'error',
        { patterns: ['*legacy*'], paths: RESTRICTED_IMPORTS },
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
      'x-pack/solutions/security/packages/data-stream-adapter/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-cell-actions/**/*.{js,mjs,ts,tsx}',
    ],
    plugins: {
      node: fixupPluginRules(nodePlugin),
    },
    languageOptions: {
      globals: { ...sanitize(globals.jest) },
    },
    rules: {
      'accessor-pairs': 'error',
      'array-callback-return': 'error',
      'no-array-constructor': 'error',
      complexity: 'warn',
      'node/no-deprecated-api': 'error',
      'no-bitwise': 'error',
      'no-continue': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-duplicate-imports': 'off',
      'no-empty-character-class': 'error',
      'no-empty-pattern': 'error',
      'no-ex-assign': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-extra-boolean-cast': 'error',
      'no-extra-label': 'error',
      'no-func-assign': 'error',
      'no-implicit-globals': 'error',
      'no-implied-eval': 'error',
      'no-invalid-regexp': 'error',
      'no-inner-declarations': 'error',
      'no-lone-blocks': 'error',
      'no-multi-assign': 'error',
      'no-misleading-character-class': 'error',
      'no-new-symbol': 'error',
      'no-obj-calls': 'error',
      'no-param-reassign': 'error',
      'no-process-exit': 'error',
      'no-prototype-builtins': 'error',
      'no-return-await': 'error',
      'no-self-compare': 'error',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'error',
      'no-this-before-super': 'error',
      'no-undef': 'off',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-useless-call': 'error',
      'no-useless-catch': 'error',
      'no-useless-concat': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'one-var-declaration-per-line': 'error',
      'prefer-object-spread': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      'react/boolean-prop-naming': 'error',
      'react/button-has-type': 'error',
      'react/display-name': 'error',
      'react/forbid-dom-props': 'error',
      'react/no-access-state-in-setstate': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-deprecated': 'error',
      'react/no-did-mount-set-state': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-redundant-should-component-update': 'error',
      'react/no-render-return-value': 'error',
      'react/no-typos': 'error',
      'react/no-string-refs': 'error',
      'react/no-this-in-sfc': 'error',
      'react/no-unescaped-entities': 'error',
      'react/no-unsafe': 'error',
      'react/no-unused-prop-types': 'error',
      'react/no-unused-state': 'error',
      'react/sort-default-props': 'error',
      'react/void-dom-elements-no-children': 'error',
      'react/jsx-no-comment-textnodes': 'error',
      'react/jsx-no-literals': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/jsx-fragments': 'error',
      'require-atomic-updates': 'error',
      'symbol-description': 'error',
      'vars-on-top': 'error',
      'import/no-duplicates': ['error'],
    },
  },
  {
    files: ['x-pack/platform/plugins/shared/cases/public/**/*.{js,mjs,ts,tsx}'],
    ignores: ['x-pack/platform/plugins/shared/cases/**/*.{test,mock,test_helper}.{ts,tsx}'],
    rules: {
      'react/display-name': ['error', { ignoreTranspilerName: true }],
    },
  },
  // Cases testing-library
  ...compat.extends('plugin:testing-library/react').map((c) => ({
    ...c,
    files: ['x-pack/platform/plugins/shared/cases/**/*.{test,mock,test_helper}.tsx'],
  })),

  /**
   * Lists overrides (Security)
   */
  {
    files: [
      'x-pack/solutions/security/plugins/lists/public/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/lists/common/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'import/no-nodejs-modules': 'error',
      'no-restricted-imports': [
        'error',
        { patterns: ['**/server/*'], paths: RESTRICTED_IMPORTS },
      ],
    },
  },
  {
    files: [
      'x-pack/solutions/security/plugins/lists/public/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/lists/common/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-for-in-array': 'error',
    },
  },
  {
    files: [
      'x-pack/solutions/security/plugins/lists/public/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/lists/common/*.{ts,tsx}',
    ],
    languageOptions: {
      globals: { ...sanitize(globals.jest) },
    },
    rules: {
      'react/boolean-prop-naming': 'error',
      'react/button-has-type': 'error',
      'react/display-name': 'error',
      'react/forbid-dom-props': 'error',
      'react/no-access-state-in-setstate': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-deprecated': 'error',
      'react/no-did-mount-set-state': 'error',
      'react/no-did-update-set-state': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-redundant-should-component-update': 'error',
      'react/no-render-return-value': 'error',
      'react/no-typos': 'error',
      'react/no-string-refs': 'error',
      'react/no-this-in-sfc': 'error',
      'react/no-unescaped-entities': 'error',
      'react/no-unsafe': 'error',
      'react/no-unused-prop-types': 'error',
      'react/no-unused-state': 'error',
      'react/sort-comp': 'error',
      'react/sort-default-props': 'error',
      'react/void-dom-elements-no-children': 'error',
      'react/jsx-no-comment-textnodes': 'error',
      'react/jsx-no-literals': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/jsx-fragments': 'error',
    },
  },

  /**
   * Mocha FTR tests
   */
  ...compat.extends('plugin:mocha/recommended').map((c) => ({
    ...c,
    files: [
      'src/platform/test/{accessibility,*functional*}/apps/**/*.{js,ts}',
      'src/platform/test/*api_integration*/**/*.{js,ts}',
      'x-pack/platform/test/{accessibility,*functional*}/apps/**/*.{js,ts}',
      'x-pack/platform/test/*api_integration*/**/*.{js,ts}',
      'x-pack/platform/test/*functional/tests/**/*.{js,ts}',
    ],
  })),
  {
    files: [
      'src/platform/test/{accessibility,*functional*}/apps/**/*.{js,ts}',
      'src/platform/test/*api_integration*/**/*.{js,ts}',
      'x-pack/platform/test/{accessibility,*functional*}/apps/**/*.{js,ts}',
      'x-pack/platform/test/*api_integration*/**/*.{js,ts}',
      'x-pack/platform/test/*functional/tests/**/*.{js,ts}',
    ],
    languageOptions: {
      globals: { ...sanitize(globals.mocha) },
    },
    rules: {
      'mocha/no-mocha-arrows': 'off',
      'mocha/no-exports': 'off',
      'mocha/no-setup-in-describe': 'off',
      'mocha/no-nested-tests': 'off',
      'mocha/no-skipped-tests': 'off',
    },
  },

  /**
   * Playwright / Scout tests
   */
  {
    files: [
      'src/platform/packages/shared/kbn-scout/src/playwright/**/*.ts',
      'x-pack/solutions/**/packages/kbn-scout-*/src/playwright/**/*.ts',
      'src/platform/{packages,plugins}/**/test/{scout,scout_*}/**/*.ts',
      'x-pack/platform/{packages,plugins}/**/test/{scout,scout_*}/**/*.ts',
      'x-pack/solutions/**/{packages,plugins}/**/test/{scout,scout_*}/**/*.ts',
    ],
    ignores: ['src/platform/packages/shared/kbn-scout/src/playwright/**/*.test.ts'],
    plugins: {
      playwright: playwrightPlugin,
    },
    settings: {
      playwright: {
        globalAliases: {
          test: ['test', 'spaceTest', 'apiTest'],
        },
      },
    },
    rules: {
      ...playwrightPlugin.configs['flat/recommended'].rules,
      'playwright/no-commented-out-tests': 'error',
      'playwright/no-conditional-expect': 'error',
      'playwright/no-conditional-in-test': 'warn',
      'playwright/no-duplicate-hooks': 'error',
      'playwright/no-focused-test': 'error',
      'playwright/no-get-by-title': 'error',
      'playwright/no-nth-methods': 'error',
      'playwright/no-page-pause': 'error',
      'playwright/no-restricted-matchers': 'error',
      'playwright/no-slowed-test': 'error',
      'playwright/no-standalone-expect': 'error',
      'playwright/no-unsafe-references': 'error',
      'playwright/no-useless-await': 'error',
      'playwright/no-wait-for-selector': 'error',
      'playwright/max-nested-describe': ['error', { max: 1 }],
      'playwright/missing-playwright-await': 'error',
      'playwright/prefer-comparison-matcher': 'error',
      'playwright/prefer-equality-matcher': 'error',
      'playwright/prefer-hooks-in-order': 'error',
      'playwright/prefer-hooks-on-top': 'error',
      'playwright/prefer-strict-equal': 'error',
      'playwright/prefer-to-be': 'error',
      'playwright/prefer-to-contain': 'error',
      'playwright/prefer-to-have-count': 'error',
      'playwright/prefer-to-have-length': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/require-to-throw-message': 'error',
      'playwright/require-top-level-describe': 'error',
      'playwright/valid-describe-callback': 'error',
      'playwright/valid-title': 'error',
      'playwright/valid-test-tags': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all', args: 'all', ignoreRestSiblings: true,
          varsIgnorePattern: '^_', argsIgnorePattern: '^_',
        },
      ],
    },
  },

  /**
   * Lists performance rules
   */
  {
    files: ['x-pack/solutions/security/plugins/lists/public/**/!(*.test).{js,mjs,ts,tsx}'],
    plugins: {
      'react-perf': reactPerfPlugin,
    },
    rules: {
      'react-perf/jsx-no-new-object-as-prop': 'error',
      'react-perf/jsx-no-new-array-as-prop': 'error',
      'react-perf/jsx-no-new-function-as-prop': 'error',
      'react/jsx-no-bind': 'error',
    },
  },

  /**
   * Lists full rules
   */
  {
    files: ['x-pack/solutions/security/plugins/lists/**/*.{js,mjs,ts,tsx}'],
    plugins: {
      node: fixupPluginRules(nodePlugin),
    },
    languageOptions: {
      globals: { ...sanitize(globals.jest) },
    },
    rules: {
      'accessor-pairs': 'error',
      'array-callback-return': 'error',
      'no-array-constructor': 'error',
      complexity: 'error',
      'consistent-return': 'error',
      'func-style': ['error', 'expression'],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
        },
      ],
      'sort-imports': ['error', { ignoreDeclarationSort: true }],
      'node/no-deprecated-api': 'error',
      'no-bitwise': 'error',
      'no-continue': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-duplicate-imports': 'off',
      'no-empty-character-class': 'error',
      'no-empty-pattern': 'error',
      'no-ex-assign': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-extra-boolean-cast': 'error',
      'no-extra-label': 'error',
      'no-func-assign': 'error',
      'no-implicit-globals': 'error',
      'no-implied-eval': 'error',
      'no-invalid-regexp': 'error',
      'no-inner-declarations': 'error',
      'no-lone-blocks': 'error',
      'no-multi-assign': 'error',
      'no-misleading-character-class': 'error',
      'no-new-symbol': 'error',
      'no-obj-calls': 'error',
      'no-param-reassign': ['error', { props: true }],
      'no-process-exit': 'error',
      'no-prototype-builtins': 'error',
      'no-return-await': 'error',
      'no-self-compare': 'error',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'error',
      'no-this-before-super': 'error',
      'no-undef': 'off',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-useless-call': 'error',
      'no-useless-catch': 'error',
      'no-useless-concat': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-escape': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'no-void': 'error',
      'one-var-declaration-per-line': 'error',
      'prefer-object-spread': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      'require-atomic-updates': 'error',
      'symbol-description': 'error',
      'vars-on-top': 'error',
      '@typescript-eslint/explicit-member-accessibility': 'error',
      '@typescript-eslint/no-this-alias': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/unified-signatures': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-template-curly-in-string': 'error',
      'sort-keys': 'error',
      'prefer-destructuring': 'error',
      'no-restricted-imports': [
        'error',
        { patterns: ['*legacy*'], paths: RESTRICTED_IMPORTS },
      ],
    },
  },

  /**
   * Alerting Services overrides
   */
  {
    files: [
      'x-pack/platform/plugins/shared/actions/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/alerting/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/stack_alerts/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/task_manager/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/event_log/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: [
      'x-pack/platform/plugins/shared/stack_connectors/server/**/*.ts',
      'x-pack/platform/plugins/shared/triggers_actions_ui/server/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  /**
   * Stack Connectors Specs package
   */
  {
    files: ['src/platform/packages/shared/kbn-connector-specs/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'import/no-nodejs-modules': 'error',
      'no-duplicate-imports': 'off',
      'import/no-duplicates': 'error',
      'no-restricted-imports': [
        'error',
        { patterns: ['**/*server*'], paths: RESTRICTED_IMPORTS },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-this-alias': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
  {
    files: ['src/platform/packages/shared/kbn-connector-specs/src/specs/**/icon/*.{ts,tsx}'],
    rules: {
      'import/no-default-export': 'off',
    },
  },

  /**
   * Lens overrides
   */
  {
    files: ['x-pack/platform/plugins/shared/lens/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  /**
   * Discover overrides
   */
  {
    files: [
      'src/platform/plugins/shared/discover/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/saved_search/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': false }],
    },
  },

  /**
   * Search overrides
   */
  {
    files: ['x-pack/solutions/search/**/*.{ts,tsx}'],
    ignores: ['x-pack/solutions/search/**/*.test.tsx'],
    rules: {
      '@kbn/i18n/strings_should_be_translated_with_i18n': 'warn',
      '@kbn/i18n/strings_should_be_translated_with_formatted_message': 'warn',
    },
  },

  /**
   * Enterprise Search overrides
   */
  {
    files: ['x-pack/solutions/search/plugins/enterprise_search/**/*.{ts,tsx}'],
    rules: {
      'import/order': [
        'error',
        {
          groups: ['unknown', ['builtin', 'external'], 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            { pattern: '{../../../../../../,../../../../../,../../../../,../../../,../../,../,./}{common/,*}__mocks__{*,/**}', group: 'unknown' },
            { pattern: '{**,.}/*.mock', group: 'unknown' },
            { pattern: 'react*', group: 'external', position: 'before' },
            { pattern: '{@elastic/**,@kbn/**,src/**}', group: 'internal' },
          ],
          pathGroupsExcludedImportTypes: [],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always-and-inside-groups',
        },
      ],
      'import/newline-after-import': 'error',
      'react-hooks/exhaustive-deps': 'off',
      'react/jsx-boolean-value': ['error', 'never'],
      'sort-keys': 1,
      '@typescript-eslint/member-ordering': [1, { default: { order: 'alphabetically' } }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { vars: 'all', args: 'after-used', ignoreRestSiblings: true, varsIgnorePattern: '^_' },
      ],
      '@kbn/telemetry/event_generating_elements_should_be_instrumented': 'warn',
    },
  },
  {
    files: ['x-pack/solutions/search/plugins/enterprise_search/**/*.{ts,tsx}'],
    ignores: ['x-pack/solutions/search/plugins/enterprise_search/**/*.{test,mock,test_helper}.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  /**
   * Serverless Search overrides
   */
  {
    files: [
      'x-pack/solutions/search/plugins/serverless_search/**/*.{ts,tsx}',
      'x-pack/solutions/search/packages/kbn-search-*',
    ],
    rules: {
      '@kbn/telemetry/event_generating_elements_should_be_instrumented': 'error',
    },
  },

  /**
   * Canvas overrides
   */
  {
    files: ['x-pack/platform/plugins/private/canvas/**/*.js'],
    rules: {
      radix: 'error',
      'import/order': [
        'error',
        { groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'] },
      ],
      'import/extensions': ['error', 'never', { json: 'always', less: 'always', svg: 'always' }],
      'react/no-did-mount-set-state': 'error',
      'react/no-did-update-set-state': 'error',
      'react/no-multi-comp': ['error', { ignoreStateless: true }],
      'react/self-closing-comp': 'error',
      'react/sort-comp': 'error',
      'react/jsx-boolean-value': 'error',
      'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
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
    files: [
      'x-pack/platform/plugins/private/canvas/gulpfile.js',
      'x-pack/platform/plugins/private/canvas/scripts/*.js',
      'x-pack/platform/plugins/private/canvas/tasks/*.js',
      'x-pack/platform/plugins/private/canvas/tasks/**/*.js',
      'x-pack/platform/plugins/private/canvas/__tests__/**/*.js',
      'x-pack/platform/plugins/private/canvas/**/{__tests__,__test__,__jest__,__fixtures__,__mocks__}/**/*.js',
    ],
    rules: {
      'import/no-extraneous-dependencies': [
        'error',
        { devDependencies: true, peerDependencies: true, packageDir: __dirname },
      ],
    },
  },
  {
    files: ['x-pack/platform/plugins/private/canvas/canvas_plugin_src/**/*.js'],
    languageOptions: {
      globals: { canvas: 'readonly', $: 'readonly' },
    },
  },
  {
    files: ['x-pack/platform/plugins/private/canvas/public/**/*.js'],
    languageOptions: {
      globals: { ...sanitize(globals.browser) },
    },
  },
  {
    files: ['src/platform/packages/shared/kbn-flot-charts/lib/**/*.js'],
    languageOptions: {
      globals: { ...sanitize(globals.jquery) },
    },
  },

  /**
   * TSVB overrides
   */
  {
    files: ['src/platform/plugins/shared/vis_types/timeseries/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'import/no-default-export': 'error',
    },
  },

  /**
   * Osquery overrides
   */
  ...compat.extends('eslint:recommended', 'plugin:react/recommended', 'plugin:@typescript-eslint/recommended').map((c) => ({
    ...c,
    files: ['x-pack/platform/plugins/shared/osquery/**/*.{js,mjs,ts,tsx}'],
  })),
  {
    files: ['x-pack/platform/plugins/shared/osquery/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: ['block-like'], next: ['*'] },
        { blankLine: 'always', prev: ['*'], next: ['return'] },
      ],
      'padded-blocks': ['error', 'always'],
      'arrow-body-style': ['error', 'as-needed'],
      'prefer-arrow-callback': 'error',
      'no-unused-vars': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['x-pack/platform/plugins/shared/osquery/public/**/!(*.test).{js,mjs,ts,tsx}'],
    plugins: {
      'react-perf': reactPerfPlugin,
    },
    rules: {
      'react-perf/jsx-no-new-object-as-prop': 'error',
      'react-perf/jsx-no-new-array-as-prop': 'error',
      'react-perf/jsx-no-new-function-as-prop': 'error',
      'react/jsx-no-bind': 'error',
    },
  },

  /**
   * Platform Security Team overrides
   */
  {
    files: [
      'src/platform/plugins/private/interactive_setup/**/*.{js,mjs,ts,tsx}',
      'src/platform/test/interactive_setup_api_integration/**/*.{js,mjs,ts,tsx}',
      'src/platform/test/interactive_setup_functional/**/*.{js,mjs,ts,tsx}',
      'packages/kbn-mock-idp-plugin/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/private/kbn-mock-idp-utils/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-security-hardening/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-user-profile-components/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/encrypted_saved_objects/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/test/encrypted_saved_objects_api_integration/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/security/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/private/security/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/shared/security/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/test/security_api_integration/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/test/security_functional/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/spaces/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/test/spaces_api_integration/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'import/order': [
        'error',
        {
          groups: ['unknown', ['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [
            { pattern: '{**,.}/*.test.mocks', group: 'unknown' },
            { pattern: '{@kbn/**,src/**,kibana{,/**}}', group: 'internal' },
          ],
          pathGroupsExcludedImportTypes: [],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],
      'import/no-duplicates': ['error'],
      'sort-imports': ['error', { ignoreCase: true, ignoreDeclarationSort: true }],
    },
  },

  /**
   * Do not allow `any`
   */
  {
    files: [
      'src/platform/packages/shared/kbn-analytics/**',
      'src/platform/plugins/private/kibana_usage_collection/**',
      'src/platform/plugins/shared/usage_collection/**',
      'src/platform/plugins/shared/telemetry/**',
      'src/platform/plugins/shared/telemetry_collection_manager/**',
      'src/platform/plugins/shared/telemetry_management_section/**',
      'x-pack/platform/plugins/private/telemetry_collection_xpack/**',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: [
      'src/core/**',
      'x-pack/platform/plugins/shared/features/**',
      'x-pack/platform/plugins/shared/licensing/**',
      'x-pack/platform/plugins/shared/global_search/**',
      'x-pack/platform/plugins/shared/cloud/**',
      'src/platform/packages/shared/kbn-config-schema',
      'src/platform/plugins/shared/saved_objects_management/**',
      'src/platform/packages/shared/kbn-analytics/**',
      'src/platform/packages/private/kbn-telemetry-tools/**',
      'src/platform/plugins/private/kibana_usage_collection/**',
      'src/platform/plugins/shared/usage_collection/**',
      'src/platform/plugins/shared/telemetry/**',
      'src/platform/plugins/shared/telemetry_collection_manager/**',
      'src/platform/plugins/shared/telemetry_management_section/**',
      'x-pack/platform/plugins/private/telemetry_collection_xpack/**',
    ],
    rules: {
      '@typescript-eslint/prefer-ts-expect-error': 'error',
    },
  },

  /**
   * Workflows Team overrides
   */
  {
    files: [
      'src/platform/plugins/shared/workflows_management/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/workflows_execution_engine/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/workflows_extensions/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-workflows/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-workflows-ui/**/*.{js,mjs,ts,tsx}',
    ],
    plugins: {
      node: fixupPluginRules(nodePlugin),
    },
    languageOptions: {
      globals: { ...sanitize(globals.jest) },
    },
    rules: {
      'accessor-pairs': 'error',
      'array-callback-return': 'error',
      'no-array-constructor': 'error',
      complexity: 'warn',
      'node/no-deprecated-api': 'error',
      'no-bitwise': 'error',
      'no-continue': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-duplicate-imports': 'off',
      'no-empty-character-class': 'error',
      'no-empty-pattern': 'error',
      'no-ex-assign': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-extra-boolean-cast': 'error',
      'no-extra-label': 'error',
      'no-func-assign': 'error',
      'no-implicit-globals': 'error',
      'no-implied-eval': 'error',
      'no-invalid-regexp': 'error',
      'no-inner-declarations': 'error',
      'no-lone-blocks': 'error',
      'no-multi-assign': 'error',
      'no-misleading-character-class': 'error',
      'no-new-symbol': 'error',
      'no-obj-calls': 'error',
      'no-param-reassign': 'error',
      'no-process-exit': 'error',
      'no-prototype-builtins': 'error',
      'no-return-await': 'error',
      'no-self-compare': 'error',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'error',
      'no-this-before-super': 'error',
      'no-undef': 'off',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-useless-call': 'error',
      'no-useless-catch': 'error',
      'no-useless-concat': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'one-var-declaration-per-line': 'error',
      'prefer-object-spread': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      'react/boolean-prop-naming': 'error',
      'react/button-has-type': 'error',
      'react/display-name': 'error',
      'react/forbid-dom-props': 'error',
      'react/no-access-state-in-setstate': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-deprecated': 'error',
      'react/no-did-mount-set-state': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-redundant-should-component-update': 'error',
      'react/no-render-return-value': 'error',
      'react/no-typos': 'error',
      'react/no-string-refs': 'error',
      'react/no-this-in-sfc': 'error',
      'react/no-unescaped-entities': 'error',
      'react/no-unsafe': 'error',
      'react/no-unused-prop-types': 'error',
      'react/no-unused-state': 'error',
      'react/sort-default-props': 'error',
      'react/void-dom-elements-no-children': 'error',
      'react/jsx-no-comment-textnodes': 'error',
      'react/jsx-no-literals': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/jsx-fragments': 'error',
      'require-atomic-updates': 'error',
      'symbol-description': 'error',
      'vars-on-top': 'error',
      'import/no-duplicates': ['error'],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-this-alias': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/unified-signatures': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: ['*legacy*', '!*.gen'],
          paths: RESTRICTED_IMPORTS,
        },
      ],
      'import/order': [
        'error',
        {
          groups: ['unknown', ['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [
            { pattern: '{**,.}/*.test.mocks', group: 'unknown' },
            { pattern: '{@kbn/**,src/**,kibana{,/**}}', group: 'internal' },
          ],
          pathGroupsExcludedImportTypes: [],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'sort-imports': ['error', { ignoreCase: true, ignoreDeclarationSort: true }],
    },
  },
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
      'import/no-nodejs-modules': 'error',
      'no-duplicate-imports': 'off',
      'import/no-duplicates': ['error'],
    },
  },
  {
    files: [
      'src/platform/plugins/shared/workflows_management/**/*.{test,mock,test_helper}.{ts,tsx}',
      'src/platform/plugins/shared/workflows_execution_engine/**/*.{test,mock,test_helper}.{ts,tsx}',
      'src/platform/plugins/shared/workflows_extensions/**/*.{test,mock,test_helper}.{ts,tsx}',
      'src/platform/packages/shared/kbn-workflows/**/*.{test,mock,test_helper}.{ts,tsx}',
      'src/platform/packages/shared/kbn-workflows-ui/**/*.{test,mock,test_helper}.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['src/platform/packages/shared/kbn-workflows/scripts/**/*.{js,ts}'],
    rules: {
      'import/no-nodejs-modules': 'off',
      'no-console': 'off',
      'no-process-exit': 'off',
    },
  },

  /**
   * Disallow `export *` in plugin index files
   */
  {
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

  /**
   * Enterprise Search Prettier override (unnecessary backticks)
   */
  {
    files: ['x-pack/solutions/search/plugins/enterprise_search/**/*.{ts,tsx}'],
    rules: {
      quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: false }],
    },
  },

  /**
   * Cloud Security Team overrides
   */
  {
    files: ['x-pack/solutions/security/plugins/cloud_security_posture/**/*.{js,mjs,ts,tsx}'],
    plugins: {
      'testing-library': testingLibraryPlugin,
    },
    rules: {
      'testing-library/await-async-utils': 'error',
    },
  },

  /**
   * .buildkite overrides
   */
  {
    files: ['.buildkite/**/*.{js,ts}'],
    rules: {
      'no-console': 'off',
      '@kbn/imports/no_unresolvable_imports': 'off',
    },
  },

  /**
   * Repo packages
   */
  {
    files: [
      'src/platform/packages/*/kbn-repo-*/**/*',
      'packages/kbn-repo-*/**/*',
      'packages/kbn-validate-next-docs-cli/**/*',
      'packages/kbn-find-used-node-modules/**/*',
    ],
    rules: {
      'max-classes-per-file': 'off',
    },
  },
  {
    files: [
      'scripts/create_observability_rules.js',
      'src/cli_setup/**',
      'src/dev/build/tasks/install_chromium.ts',
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
      'no-console': 'off',
      '@kbn/imports/uniform_imports': 'off',
    },
  },
  {
    files: ['packages/kbn-dependency-ownership/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },

  /**
   * Cypress restricted imports
   */
  {
    files: ['x-pack/**/cypress/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@kbn/cypress-test-helper',
              message: "Import from a sub-path (e.g. '@kbn/cypress-test-helper/src/utils'). Cypress uses Webpack, which requires direct file imports to avoid parse errors.",
            },
          ],
        },
      ],
    },
  },

  /**
   * Scout test restricted imports (platform)
   */
  {
    files: [
      'src/platform/plugins/**/test/{scout,scout_*}/**/*.ts',
      'x-pack/platform/**/plugins/**/test/{scout,scout_*}/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@playwright/test', message: "Platform tests should import only from '@kbn/scout'." },
            { name: 'playwright', message: "Platform tests should import only from '@kbn/scout'." },
          ],
          patterns: [
            { group: ['@kbn/scout-*', '@playwright/test/**', 'playwright/**'], message: "Platform tests should import only from '@kbn/scout'." },
          ],
        },
      ],
    },
  },
  {
    files: ['x-pack/solutions/observability/plugins/**/test/{scout,scout_*}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@kbn/scout', message: "Observability solution tests should import from '@kbn/scout-oblt' instead." },
            { name: '@playwright/test', message: "Observability solution tests should import from '@kbn/scout-oblt' instead." },
            { name: 'playwright', message: "Observability solution tests should import from '@kbn/scout-oblt' instead." },
          ],
          patterns: [
            { group: ['@kbn/scout/**', '@playwright/test/**', 'playwright/**'], message: "Observability solution tests should import from '@kbn/scout-oblt' instead." },
          ],
        },
      ],
    },
  },
  {
    files: ['x-pack/solutions/search/plugins/**/test/{scout,scout_*}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@kbn/scout', message: "Search solution tests should import from '@kbn/scout-search' instead." },
            { name: '@playwright/test', message: "Search solution tests should import from '@kbn/scout-search' instead." },
            { name: 'playwright', message: "Search solution tests should import from '@kbn/scout-search' instead." },
          ],
          patterns: [
            { group: ['@kbn/scout/**', '@playwright/test/**', 'playwright/**'], message: "Search solution tests should import from '@kbn/scout-search' instead." },
          ],
        },
      ],
    },
  },
  {
    files: ['x-pack/solutions/security/plugins/**/test/{scout,scout_*}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@kbn/scout', message: "Security solution tests should import from '@kbn/scout-security' instead." },
            { name: '@playwright/test', message: "Security solution tests should import from '@kbn/scout-security' instead." },
            { name: 'playwright', message: "Security solution tests should import from '@kbn/scout-security' instead." },
          ],
          patterns: [
            { group: ['@kbn/scout/**', '@playwright/test/**', 'playwright/**'], message: "Security solution tests should import from '@kbn/scout-security' instead." },
          ],
        },
      ],
    },
  },

  /**
   * Scout custom rules
   */
  {
    files: [
      'src/platform/plugins/**/test/{scout,scout_*}/**/*.ts',
      'x-pack/platform/**/plugins/**/test/{scout,scout_*}/**/*.ts',
      'x-pack/solutions/**/plugins/**/test/{scout,scout_*}/**/*.ts',
    ],
    rules: {
      '@kbn/eslint/scout_no_describe_configure': 'error',
      '@kbn/eslint/scout_max_one_describe': 'error',
      '@kbn/eslint/scout_test_file_naming': 'error',
      '@kbn/eslint/scout_require_api_client_in_api_test': 'error',
      '@kbn/eslint/scout_require_global_setup_hook_in_parallel_tests': 'error',
      '@kbn/eslint/scout_no_es_archiver_in_parallel_tests': 'error',
      '@kbn/eslint/require_include_in_check_a11y': 'warn',
    },
  },
  {
    files: ['x-pack/solutions/**/plugins/**/test/scout/api/**/*.ts'],
    rules: {
      '@kbn/eslint/scout_expect_import': 'error',
    },
  },

  /**
   * Deployment-agnostic test files
   */
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

  /**
   * Restrict fs imports in production code
   */
  {
    files: [
      'src/platform/plugins/shared/**/*.ts',
      'x-pack/solutions/**/*.ts',
      'x-pack/plugins/**/*.ts',
      'x-pack/platform/plugins/shared/**/*.ts',
    ],
    ignores: [
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
      'x-pack/platform/plugins/shared/automatic_import/**',
    ],
    rules: {
      '@kbn/eslint/require_kbn_fs': [
        'error',
        {
          restrictedMethods: ['writeFile', 'writeFileSync', 'createWriteStream', 'appendFile', 'appendFileSync'],
          disallowedMessage: 'Use `@kbn/fs` for file write operations instead of direct `fs` in production code',
        },
      ],
    },
  },

  // **************************************************************************
  // 5. Inlined package-level configs
  // **************************************************************************

  /**
   * Enzyme restriction for Security Solution directories
   * These directories restrict enzyme imports to encourage @testing-library/react
   */
  {
    files: ENZYME_SECURITY_DIRS.filter((d) => d !== 'src/platform/packages/shared/kbn-securitysolution-ecs').map((d) => `${d}/**/*.{ts,tsx}`),
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['*legacy*'], paths: [...RESTRICTED_IMPORTS, ENZYME_RESTRICTION] },
      ],
    },
  },
  {
    files: ENZYME_SECURITY_DIRS.filter((d) => d !== 'src/platform/packages/shared/kbn-securitysolution-ecs').map((d) => `${d}/**/*.{js,mjs}`),
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['**/server/*'], paths: [...RESTRICTED_IMPORTS, ENZYME_RESTRICTION] },
      ],
    },
  },
  {
    files: ['src/platform/packages/shared/kbn-securitysolution-ecs/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        ...RESTRICTED_IMPORTS,
        ENZYME_RESTRICTION,
      ],
    },
  },

  /**
   * import/no-default-export off
   */
  {
    files: [
      'src/platform/packages/shared/kbn-synthtrace/src/**/*',
      'src/platform/packages/shared/kbn-synthtrace-client/src/**/*',
    ],
    rules: {
      'import/no-default-export': 'off',
    },
  },

  /**
   * Import extensions for vite-server
   */
  {
    files: ['packages/kbn-vite-server/**/*'],
    rules: {
      'import/extensions': ['error', 'always', { json: 'always', less: 'always', svg: 'always' }],
    },
  },

  /**
   * Cypress configs (Security Solution)
   */
  ...compat.extends('plugin:cypress/recommended').map((c) => ({
    ...c,
    files: [
      'x-pack/solutions/security/test/security_solution_cypress/cypress/**/*',
      'x-pack/solutions/security/plugins/security_solution/public/management/cypress/**/*',
    ],
  })),
  {
    files: [
      'x-pack/solutions/security/test/security_solution_cypress/cypress/**/*',
      'x-pack/solutions/security/plugins/security_solution/public/management/cypress/**/*',
    ],
    plugins: {
      cypress: cypressPlugin,
    },
    languageOptions: {
      globals: { ...sanitize(globals.mocha) },
    },
    rules: {
      'cypress/no-force': 'warn',
      'import/no-extraneous-dependencies': 'off',
    },
  },

  /**
   * Canvas custom react properties
   */
  {
    files: ['x-pack/platform/plugins/private/canvas/**/*'],
    rules: {
      'react/no-unknown-property': ['error', { ignore: ['css', 'kbn-canvas-height', 'kbn-canvas-page', 'kbn-canvas-url', 'kbn-canvas-width'] }],
    },
  },

  /**
   * @typescript-eslint/consistent-type-definitions off (multiple packages)
   */
  {
    files: [
      'x-pack/solutions/security/plugins/kubernetes_security/**/*',
      'x-pack/solutions/security/plugins/session_view/**/*',
      'src/platform/plugins/shared/expressions/**/*',
      'src/platform/plugins/shared/embeddable/**/*',
      'x-pack/examples/lens_embeddable_inline_editing_example/**/*',
      'packages/kbn-plugin-check/**/*',
      'x-pack/examples/ui_actions_enhanced_examples/**/*',
      'x-pack/examples/third_party_vis_lens_example/**/*',
      'x-pack/examples/third_party_lens_navigation_prompt/**/*',
      'x-pack/examples/testing_embedded_lens/**/*',
      'x-pack/examples/exploratory_view_example/**/*',
      'x-pack/examples/embedded_lens_example/**/*',
    ],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },

  /**
   * kibana_utils extra rules
   */
  {
    files: ['src/platform/plugins/shared/kibana_utils/**/*'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-explicit-any': ['error', { ignoreRestArgs: true }],
    },
  },

  /**
   * @typescript-eslint/naming-convention off (generated workflow specs)
   */
  {
    files: [
      'src/platform/packages/shared/kbn-workflows/spec/kibana/generated/**/*',
      'src/platform/packages/shared/kbn-workflows/spec/elasticsearch/generated/**/*',
    ],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },

  /**
   * Observability AI / Inference evaluation overrides
   */
  {
    files: [
      'x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/**/*.spec.ts',
      'x-pack/platform/plugins/shared/inference/scripts/evaluation/**/*.spec.ts',
    ],
    rules: {
      '@kbn/imports/require_import': ['error', '@kbn/ambient-ftr-types'],
      '@typescript-eslint/triple-slash-reference': 'off',
      'spaced-comment': 'off',
    },
  },

  /**
   * Lens config builder example
   */
  {
    files: ['x-pack/examples/lens_config_builder_example/**/*'],
    rules: {
      'import/no-extraneous-dependencies': 'off',
    },
  },

  // **************************************************************************
  // 6. eslint-plugin-oxlint — disables ESLint rules already handled by oxlint
  //    so ESLint only checks rules that oxlint cannot run yet.
  // **************************************************************************
  ...oxlintPlugin.configs['flat/recommended'],

  // **************************************************************************
  // 7. Prettier MUST be last - disables all conflicting rules
  // **************************************************************************
  {
    rules: Object.fromEntries(
      Object.entries(prettierConfig.rules).filter(([rule]) => {
        // Only include rules for plugins that are actually used in this config.
        // eslint-config-prettier disables rules for many plugins (babel, vue,
        // flowtype, unicorn, standard, @babel) that aren't part of this project.
        if (!rule.includes('/')) return true;
        const pluginName = rule.split('/').slice(0, -1).join('/');
        return ![
          'babel', '@babel', 'vue', 'flowtype', 'standard', 'unicorn',
        ].includes(pluginName);
      })
    ),
  },
];
