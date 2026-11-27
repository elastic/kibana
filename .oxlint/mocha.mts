/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintOverride } from 'oxlint';

export const mochaOverrides: OxlintOverride[] = [
  {
    files: ['**/*.js', '**/*.mjs'],
    rules: {
      'mocha/handle-done-callback': 'error',
      'mocha/no-exclusive-tests': 'error',
    },
  },
  {
    files: [
      'src/platform/test/harden/*.js',
      'src/platform/packages/shared/kbn-safer-lodash-set/test/*.js',
    ],
    rules: {
      'mocha/handle-done-callback': 'off',
    },
  },
  {
    // FTR suites
    files: [
      'src/platform/test/{accessibility,*functional*}/apps/**/*.{js,ts}',
      'src/platform/test/*api_integration*/**/*.{js,ts}',
      'x-pack/platform/test/{accessibility,*functional*}/apps/**/*.{js,ts}',
      'x-pack/platform/test/*api_integration*/**/*.{js,ts}',
      'x-pack/platform/test/*functional/tests/**/*.{js,ts}',
    ],
    rules: {
      // `plugin:mocha/recommended` without `no-exports`, `no-mocha-arrows`, `no-nested-tests`,
      // `no-setup-in-describe` and `no-skipped-tests`
      'mocha/handle-done-callback': 'error',
      'mocha/max-top-level-suites': ['error', { limit: 1 }],
      'mocha/no-async-describe': 'error',
      'mocha/no-empty-description': 'error',
      'mocha/no-exclusive-tests': 'warn',
      'mocha/no-global-tests': 'error',
      'mocha/no-identical-title': 'error',
      'mocha/no-pending-tests': 'warn',
      'mocha/no-return-and-callback': 'error',
      'mocha/no-sibling-hooks': 'error',
      'mocha/no-top-level-hooks': 'warn',
    },
  },
];
