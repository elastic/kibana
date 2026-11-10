/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';
import type { OxlintOverride } from 'oxlint';

/** Packages which should not be included within production code. */
const DEV_PACKAGE_DIRS = getPackages(REPO_ROOT).flatMap((pkg) =>
  pkg.isDevOnly() ? pkg.normalizedRepoRelativeDir : []
);

/** Directories (at any depth) which include dev-only code. */
const DEV_DIRECTORIES = [
  '.storybook',
  '__tests__',
  '__test__',
  '__jest__',
  '__fixtures__',
  '__mocks__',
  '__stories__',
  'e2e',
  'cypress',
  'fixtures',
  'ftr_e2e',
  'integration_tests',
  'manual_tests',
  'mock',
  'mocks',
  'storybook',
  'scripts',
  'test',
  'test-d',
  'test_utils',
  'test_utilities',
  'test_helpers',
  'tests_client_integration',
  'tsd_tests',
];

/** File patterns for dev-only code. */
const DEV_FILE_PATTERNS = [
  '*.mock.{js,ts,tsx}',
  '*.test.{js,ts,tsx}',
  '*.test.helpers.{js,ts,tsx}',
  '*.stories.{js,ts,tsx}',
  '*.story.{js,ts,tsx}',
  '*.stub.{js,ts,tsx}',
  'mock.{js,ts,tsx}',
  '_stubs.{js,ts,tsx}',
  '{testHelpers,test_helper,test_utils}.{js,ts,tsx}',
  '{postcss,webpack,cypress}.config.{js,ts}',
];

/** Glob patterns which describe dev-only code. */
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
  'src/platform/packages/shared/esql/kbn-esql-language/scripts/**/*',
  'src/platform/kbn-ui/_tooling/**/*',
];

/**
 * Single package.json rules: dependencies are declared in the root package.json, not in the
 * child package.json files.
 */
export const importExtraneousDependenciesOverrides: OxlintOverride[] = [
  {
    files: ['{src,x-pack,packages}/**/*.{js,mjs,ts,tsx}'],
    rules: {
      '@kbn/compat/import-no-extraneous-dependencies': [
        'error',
        { devDependencies: false, peerDependencies: true, packageDir: REPO_ROOT },
      ],
    },
  },
  {
    // Files that ARE allowed to use devDependencies. ESLint nested this override in the one above,
    // so it only matched files that one matches too.
    files: DEV_PATTERNS.filter((pattern) =>
      /^(\{packages,src,x-pack\}|src|x-pack|packages)\//.test(pattern)
    ),
    excludeFiles: ['**/*.{jsx,cjs,cts,mts}'],
    rules: {
      '@kbn/compat/import-no-extraneous-dependencies': [
        'error',
        { devDependencies: true, peerDependencies: true, packageDir: REPO_ROOT },
      ],
    },
  },
];
