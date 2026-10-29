/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintOverride } from 'oxlint';

// `eslint-plugin-import` rules migrated from ESLint, with the file scopes, order and options they
// had there. Later overrides win, as in ESLint, so the order below follows `.eslintrc.js`, with
// the nested `.eslintrc.js` files last because ESLint applied them over the root config.

// ESLint ran these rules on the extensions it lints; keep them off `.cjs`, `.mts`, etc.
const ESLINT_LINTED_EXTENSIONS = '{js,mjs,ts,tsx}';

const inDirs = (dirs: string[]) => dirs.map((dir) => `${dir}/**/*.${ESLINT_LINTED_EXTENSIONS}`);

const IMPORT_PLUGIN_RULES = [
  'import/default',
  'import/export',
  'import/extensions',
  'import/named',
  'import/namespace',
  'import/newline-after-import',
  'import/no-commonjs',
  'import/no-default-export',
  'import/no-duplicates',
  'import/no-dynamic-require',
  'import/no-named-as-default',
  'import/no-named-as-default-member',
  'import/no-nodejs-modules',
] as const;

export const importPluginOverrides: OxlintOverride[] = [
  // @kbn/eslint-config javascript.js
  {
    files: ['**/*.{js,mjs}'],
    rules: {
      'import/named': 'error',
      'import/namespace': 'error',
      'import/default': 'error',
      'import/export': 'error',
      'import/no-named-as-default': 'error',
      'import/no-named-as-default-member': 'error',
      'import/no-duplicates': 'error',
      'import/no-dynamic-require': 'error',
    },
  },
  // @kbn/eslint-config typescript.js
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'import/no-default-export': 'error',
    },
  },
  {
    // Client-side plugin code. Tests and Jest configs run in Node and may use CommonJS.
    files: inDirs([
      'src/platform/plugins/*/*/public',
      'x-pack/platform/plugins/*/*/public',
      'x-pack/solutions/*/plugins/*/public',
    ]),
    excludeFiles: ['**/*.test.{js,mjs,ts,tsx}', '**/jest.*.js'],
    rules: {
      'import/no-commonjs': 'error',
    },
  },
  {
    // Allow default exports
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
      '**/playwright.v2.config.ts',
      '**/*.playwright.config.ts',
      '**/parallel.playwright.config.ts',
      'x-pack/platform/packages/shared/isomer/isomer-components/isomer_studio.config.ts',
      'x-pack/platform/packages/shared/isomer/isomer-components/isomer_studio_fonts.ts',
    ],
    rules: {
      'import/no-default-export': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-named-as-default': 'off',
    },
  },
  {
    // Files that run BEFORE node version check
    files: ['scripts/**/*.js', 'src/setup_node_env/**/*.js'],
    rules: {
      'import/no-commonjs': 'off',
    },
  },
  {
    // Files that run AFTER node version check and are not also transpiled with babel
    files: [
      '**/.eslintrc.js',
      'packages/kbn-eslint-plugin-eslint/**/*',
      'x-pack/gulpfile.js',
      'x-pack/scripts/*.js',
      '**/jest.config.js',
    ],
    excludeFiles: ['**/integration_tests/**/*'],
    rules: {
      'import/no-commonjs': 'off',
    },
  },
  {
    // Automatic Import front end and common files
    files: inDirs([
      'x-pack/platform/plugins/shared/automatic_import/public',
      'x-pack/platform/plugins/shared/automatic_import/common',
    ]),
    rules: {
      'import/no-nodejs-modules': 'error',
    },
  },
  {
    // Security Solution, Elastic Assistant, Cases and Timelines front end and common files
    files: inDirs([
      'x-pack/solutions/security/plugins/ecs_data_quality_dashboard/common',
      'x-pack/solutions/security/plugins/elastic_assistant/common',
      'x-pack/platform/packages/shared/kbn-elastic-assistant',
      'x-pack/platform/packages/shared/kbn-elastic-assistant-common',
      'x-pack/solutions/security/packages',
      'x-pack/solutions/security/plugins/security_solution/public',
      'x-pack/solutions/security/plugins/security_solution_ess/public',
      'x-pack/solutions/security/plugins/security_solution_serverless/public',
      'x-pack/solutions/security/plugins/security_solution/common',
      'x-pack/solutions/security/plugins/security_solution_ess/common',
      'x-pack/solutions/security/plugins/security_solution_serverless/common',
      'x-pack/solutions/security/plugins/timelines/public',
      'x-pack/solutions/security/plugins/timelines/common',
      'x-pack/platform/plugins/shared/cases/public',
      'x-pack/platform/plugins/shared/cases/common',
      'src/platform/packages/shared/kbn-cell-actions',
    ]),
    rules: {
      'import/no-nodejs-modules': 'error',
    },
  },
  {
    files: inDirs([
      'x-pack/solutions/security/packages/test-api-clients',
      'x-pack/solutions/security/packages/kbn-security-evals-matrix',
    ]),
    rules: {
      'import/no-nodejs-modules': 'off',
    },
  },
  {
    // `import/no-duplicates` in the TS packages that opted in
    files: inDirs([
      'x-pack/platform/plugins/shared/automatic_import',
      'x-pack/solutions/security/plugins/ecs_data_quality_dashboard',
      'x-pack/solutions/security/plugins/elastic_assistant',
      'x-pack/platform/packages/shared/kbn-elastic-assistant',
      'x-pack/platform/packages/shared/kbn-elastic-assistant-common',
      'x-pack/platform/packages/shared/kbn-langchain',
      'x-pack/solutions/security/packages',
      'x-pack/solutions/security/plugins/security_solution',
      'x-pack/solutions/security/plugins/security_solution_ess',
      'x-pack/solutions/security/plugins/security_solution_serverless',
      'x-pack/solutions/security/plugins/timelines',
      'x-pack/platform/plugins/shared/cases',
      'src/platform/packages/shared/kbn-cell-actions',
      'src/platform/packages/shared/kbn-connector-specs',
      'src/platform/plugins/private/interactive_setup',
      'packages/kbn-mock-idp-plugin',
      'src/platform/packages/private/kbn-mock-idp-utils',
      'src/platform/packages/shared/kbn-security-hardening',
      'src/platform/packages/shared/kbn-user-profile-components',
      'x-pack/platform/plugins/shared/encrypted_saved_objects',
      'x-pack/platform/test/encrypted_saved_objects_api_integration',
      'x-pack/platform/plugins/shared/security',
      'x-pack/platform/packages/private/security',
      'x-pack/platform/packages/shared/security',
      'x-pack/platform/test/security_api_integration',
      'x-pack/platform/test/security_functional',
      'x-pack/platform/plugins/shared/spaces',
      'x-pack/platform/test/spaces_api_integration',
      'src/platform/plugins/shared/workflows_management',
      'src/platform/plugins/shared/workflows_execution_engine',
      'src/platform/plugins/shared/workflows_extensions',
      'src/platform/packages/shared/kbn-workflows',
      'src/platform/packages/shared/kbn-workflows-ui',
    ]),
    rules: {
      'import/no-duplicates': 'error',
    },
  },
  {
    // ESLint fixes the generated API client bundles with this rule and `no_unused_imports` in one
    // pass, as the OpenAPI generator expects. See the matching override in `.eslintrc.js`.
    files: ['x-pack/solutions/security/packages/test-api-clients/{supertest,scout}/*.gen.ts'],
    rules: {
      'import/no-duplicates': 'off',
    },
  },
  {
    // Lists front end and common files
    files: inDirs([
      'x-pack/solutions/security/plugins/lists/public',
      'x-pack/solutions/security/plugins/lists/common',
    ]),
    rules: {
      'import/no-nodejs-modules': 'error',
    },
  },
  {
    files: inDirs(['src/platform/packages/shared/kbn-connector-specs']),
    rules: {
      'import/no-nodejs-modules': 'error',
    },
  },
  {
    // Node-only dev tooling, not reachable from the package entry points
    files: [
      'src/platform/packages/shared/kbn-connector-specs/**/*.test.{ts,tsx}',
      'src/platform/packages/shared/kbn-connector-specs/scripts/**/*.ts',
      'src/platform/packages/shared/kbn-connector-specs/src/test/vendor_api/**/*.ts',
    ],
    rules: {
      'import/no-nodejs-modules': 'off',
    },
  },
  {
    files: ['src/platform/packages/shared/kbn-connector-specs/src/specs/**/icon/*.{ts,tsx}'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    files: ['x-pack/solutions/search/plugins/enterprise_search/**/*.{ts,tsx}'],
    rules: {
      'import/newline-after-import': 'error',
    },
  },
  {
    files: ['x-pack/platform/plugins/private/canvas/**/*.js'],
    rules: {
      'import/extensions': ['error', 'never', { json: 'always', less: 'always', svg: 'always' }],
    },
  },
  {
    // `getESFilter` looks up filter builders by the canvas filter type.
    files: ['x-pack/platform/plugins/private/canvas/common/lib/get_es_filter.js'],
    rules: {
      'import/namespace': ['error', { allowComputed: true }],
    },
  },
  {
    files: [
      'src/platform/packages/shared/kbn-flot-charts/index.js',
      'src/platform/packages/shared/kbn-flot-charts/index.d.ts',
    ],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    files: inDirs(['src/platform/plugins/shared/vis_types/timeseries']),
    // Playwright resolves its configuration from a default export.
    excludeFiles: ['src/platform/plugins/shared/vis_types/timeseries/**/*playwright.config.ts'],
    rules: {
      'import/no-default-export': 'error',
    },
  },
  {
    // Workflows front end and common files
    files: inDirs([
      'src/platform/plugins/shared/workflows_management/public',
      'src/platform/plugins/shared/workflows_management/common',
      'src/platform/plugins/shared/workflows_extensions/public',
      'src/platform/plugins/shared/workflows_extensions/common',
      'src/platform/packages/shared/kbn-workflows',
      'src/platform/packages/shared/kbn-workflows-ui',
    ]),
    rules: {
      'import/no-nodejs-modules': 'error',
    },
  },
  {
    files: ['src/platform/packages/shared/kbn-workflows/scripts/**/*.{js,ts}'],
    rules: {
      'import/no-nodejs-modules': 'off',
    },
  },
  {
    // Synthtrace scenarios export their scenario as the default export.
    files: inDirs([
      'src/platform/packages/shared/kbn-synthtrace-client/src',
      'src/platform/packages/shared/kbn-synthtrace/src',
      'x-pack/platform/plugins/shared/streams/test/scenarios',
      'x-pack/solutions/observability/plugins/apm/test/scenarios',
      'x-pack/solutions/observability/plugins/infra/test/scenarios',
      'x-pack/solutions/observability/plugins/synthetics/test/scenarios',
    ]),
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    // Node-only packages
    files: inDirs(
      [
        'kbn-evals-suite-alert-analysis-workflow',
        'kbn-evals-suite-alerts-rag',
        'kbn-evals-suite-attack-discovery-fp-tp',
        'kbn-evals-suite-attack-discovery',
        'kbn-evals-suite-detection-watch-rule-creation',
        'kbn-evals-suite-detection-watch-rule-tuning',
        'kbn-evals-suite-hunt-watch',
        'kbn-evals-suite-lead-generation',
        'kbn-evals-suite-security-alert-triage',
        'security-mitre-attack-server',
      ].map((pkg) => `x-pack/solutions/security/packages/${pkg}`)
    ),
    rules: {
      'import/no-nodejs-modules': 'off',
    },
  },
  {
    // CodeQL query fixtures call APIs that do not exist so the queries have something to flag.
    files: ['.github/codeql/**'],
    rules: {
      'import/namespace': 'off',
    },
  },
  {
    // ESLint skips hidden directories except those .eslintignore re-includes.
    files: ['**/.*/**'],
    excludeFiles: ['**/.buildkite/**', '**/.github/**', '**/.storybook/**'],
    rules: Object.fromEntries(IMPORT_PLUGIN_RULES.map((rule) => [rule, 'off'])),
  },
];
