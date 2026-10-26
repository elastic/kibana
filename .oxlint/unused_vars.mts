/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintOverride } from 'oxlint';

import { SCOUT_TEST_FILE_GLOBS } from './scout.mts';

// Oxlint's `no-unused-vars` defaults `argsIgnorePattern`/`varsIgnorePattern` to `^_` unless an
// options object is passed, so every entry passes one. The defaults spelled out below are
// ESLint 8's (`no-unused-vars`) and typescript-eslint 8's (`@typescript-eslint/no-unused-vars`).
// Order matters: later overrides win, so the osquery opt-out stays last.
export const unusedVarsOverrides: OxlintOverride[] = [
  {
    files: ['**/*.js', '**/*.mjs'],
    rules: {
      'no-unused-vars': [
        'error',
        { vars: 'all', args: 'after-used', caughtErrors: 'none', ignoreRestSiblings: false },
      ],
    },
  },
  {
    files: [
      'x-pack/solutions/security/plugins/lists/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-connector-specs/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'no-unused-vars': [
        'error',
        { vars: 'all', args: 'after-used', caughtErrors: 'all', ignoreRestSiblings: false },
      ],
    },
  },
  {
    files: ['x-pack/solutions/search/plugins/enterprise_search/**/*.{ts,tsx}'],
    rules: {
      'no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          caughtErrors: 'all',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Check all function arguments to catch unused destructured params.
    files: ['**/kbn-scout*/src/playwright/**/*.ts', ...SCOUT_TEST_FILE_GLOBS],
    excludeFiles: ['src/platform/packages/shared/kbn-scout/src/playwright/**/*.test.ts'],
    rules: {
      'no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'all',
          caughtErrors: 'all',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['x-pack/platform/plugins/shared/osquery/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
];
