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
     * The rules of these plugins run in oxlint (.oxlint/*.mts). The plugins stay registered so
     * `eslint-disable` directives naming their rules resolve.
     */
    {
      files: ['{src,x-pack,packages}/**/*.{js,mjs,ts,tsx}'],
      plugins: ['formatjs'],
    },
    {
      files: [
        'x-pack/platform/plugins/shared/fleet/**/*.{js,mjs,ts,tsx}',
        'x-pack/platform/plugins/shared/cases/**/*.{test,mock,test_helper}.tsx',
        'x-pack/solutions/security/plugins/cloud_security_posture/**/*.{js,mjs,ts,tsx}',
      ],
      plugins: ['testing-library'],
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
        'x-pack/solutions/security/plugins/lists/**/*.{js,mjs,ts,tsx}',
        'x-pack/platform/plugins/shared/cases/**/*.{js,mjs,ts,tsx}',
        'src/platform/packages/shared/kbn-cell-actions/**/*.{js,mjs,ts,tsx}',
        'src/platform/plugins/shared/workflows_management/**/*.{js,mjs,ts,tsx}',
        'src/platform/plugins/shared/workflows_execution_engine/**/*.{js,mjs,ts,tsx}',
        'src/platform/plugins/shared/workflows_extensions/**/*.{js,mjs,ts,tsx}',
        'src/platform/packages/shared/kbn-workflows/**/*.{js,mjs,ts,tsx}',
        'src/platform/packages/shared/kbn-workflows-ui/**/*.{js,mjs,ts,tsx}',
      ],
      plugins: ['eslint-plugin-n'],
    },
    {
      files: [
        'x-pack/solutions/security/plugins/lists/public/**/!(*.test).{js,mjs,ts,tsx}',
        'x-pack/platform/plugins/shared/osquery/public/**/!(*.test).{js,mjs,ts,tsx}',
      ],
      plugins: ['react-perf'],
    },
    {
      files: ['**/kbn-scout*/src/playwright/**/*.ts', ...SCOUT_TEST_FILE_GLOBS],
      excludedFiles: ['src/platform/packages/shared/kbn-scout/src/playwright/**/*.test.ts'],
      plugins: ['playwright'],
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
