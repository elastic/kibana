/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintConfig, OxlintOverride } from 'oxlint';

import { SCOUT_TEST_FILE_GLOBS } from './scout.mts';

/** Scout test suites plus the Scout framework's own Playwright code. */
const PLAYWRIGHT_FILE_GLOBS = ['**/kbn-scout*/src/playwright/**/*.ts', ...SCOUT_TEST_FILE_GLOBS];

export const playwrightSettings: OxlintConfig['settings'] = {
  playwright: {
    globalAliases: {
      test: ['test', 'spaceTest', 'apiTest'],
    },
  },
};

export const playwrightOverrides: OxlintOverride[] = [
  {
    files: PLAYWRIGHT_FILE_GLOBS,
    excludeFiles: ['src/platform/packages/shared/kbn-scout/src/playwright/**/*.test.ts'],
    rules: {
      // `plugin:playwright/recommended`
      'playwright/no-duplicate-slow': 'warn',
      'playwright/no-force-option': 'warn',
      'playwright/no-networkidle': 'error',
      'playwright/no-skipped-test': 'warn',
      'playwright/no-unused-locators': 'error',
      'playwright/no-useless-not': 'warn',
      'playwright/no-wait-for-navigation': 'error',
      'playwright/no-wait-for-timeout': 'warn',
      'playwright/prefer-locator': 'warn',
      'playwright/valid-expect': 'error',
      'playwright/valid-expect-in-promise': 'error',
      'playwright/missing-playwright-await': 'error',
      'playwright/no-conditional-in-test': 'warn',
      'playwright/no-focused-test': 'error',
      'playwright/no-standalone-expect': 'error',
      'playwright/no-unsafe-references': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/valid-describe-callback': 'error',
      'playwright/valid-title': 'error',

      // Allow assert* helpers (e.g. assertDowngradeResult) that wrap expect()
      // calls. The linter can't trace expects into called functions, so without
      // this config tests using assertion helpers trigger a false-positive
      // "Test has no assertions" warning. Registering the assert* pattern as
      // known assertion functions avoids that.
      'playwright/expect-expect': [
        'warn',
        {
          assertFunctionNames: ['expect', 'expect.soft'],
          assertFunctionPatterns: ['^assert[A-Z]'],
        },
      ],
      'playwright/consistent-spacing-between-blocks': 'error',
      'playwright/no-commented-out-tests': 'error',
      'playwright/no-conditional-expect': 'error',
      'playwright/no-duplicate-hooks': 'error',
      'playwright/no-element-handle': 'error',
      'playwright/no-eval': 'error',
      'playwright/no-get-by-title': 'error',
      'playwright/no-identical-title': 'error',
      'playwright/no-magic-timeouts': 'warn',
      'playwright/no-nested-step': 'error',
      'playwright/no-nth-methods': 'error',
      'playwright/no-page-pause': 'error',
      'playwright/no-raw-locators': ['warn', { allowed: ['[data-test-subj'] }],
      'playwright/no-restricted-matchers': 'error',
      'playwright/no-slowed-test': 'error',
      'playwright/no-test-return-statement': 'error',
      'playwright/no-unnecessary-assertions': 'error',
      'playwright/no-useless-await': 'error',
      'playwright/no-wait-for-selector': 'error',
      'playwright/max-nested-describe': ['error', { max: 1 }],
      'playwright/prefer-comparison-matcher': 'error',
      'playwright/prefer-equality-matcher': 'error',
      'playwright/prefer-hooks-in-order': 'error',
      'playwright/prefer-hooks-on-top': 'error',
      'playwright/prefer-native-locators': 'warn',
      'playwright/prefer-strict-equal': 'error',
      'playwright/prefer-to-be': 'error',
      'playwright/prefer-to-contain': 'error',
      'playwright/prefer-to-have-count': 'error',
      'playwright/prefer-to-have-length': 'error',
      'playwright/require-to-throw-message': 'error',
      'playwright/require-top-level-describe': 'error',
      // Scout has its own runtime validator for test tags, so `playwright/valid-test-tags` stays off.
    },
  },
  {
    // no-export only applies to spec files — fixture/helper modules legitimately export
    files: PLAYWRIGHT_FILE_GLOBS.map((glob) => glob.replace(/\*\.ts$/, '*.spec.ts')),
    rules: {
      'playwright/no-export': 'error',
    },
  },
];
