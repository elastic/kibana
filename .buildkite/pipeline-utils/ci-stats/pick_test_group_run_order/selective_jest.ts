/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { allChangedFilesInScope, createScopeMatcher } from '../../affected-packages';

/**
 * Jest-tests-only fast path. Distinct from `selective_testing.ts`, which narrows
 * *which* Jest configs run: this only answers "does the whole diff consist of
 * Jest test artifacts?" so FTR/Cypress/Scout can be skipped.
 *
 * Jest discovers tests via `testMatch: ['**\/*.test.{js,mjs,ts,tsx}']`, and FTR
 * specs deliberately avoid the `.test.` suffix (Jest would otherwise run them).
 * So a `.test.*` file (or a Jest `__snapshots__` artifact) can only feed Jest —
 * it cannot regress application code, FTR, Cypress, or Scout.
 */
const JEST_TESTS_ONLY_SCOPE_GLOBS: readonly string[] = [
  '**/*.test.{js,mjs,ts,tsx}',
  '**/__snapshots__/**',
];

const JEST_TESTS_ONLY_IGNORE_PATTERNS: readonly string[] = [
  '**/README*',
  '**/*.md',
  '**/CHANGELOG*',
];

/**
 * Returns `true` when a single file is a Jest test artifact (spec or snapshot).
 */
export const isJestTestPath = createScopeMatcher(JEST_TESTS_ONLY_SCOPE_GLOBS);

/**
 * Returns `true` only when every changed file is a Jest test artifact (spec or
 * snapshot) or documentation noise. Falls back to `false` on an empty diff or
 * anything unrecognised, so unrelated changes keep the default test discovery.
 */
export function isJestTestsOnlyDiff(changedFiles: readonly string[]): boolean {
  return allChangedFilesInScope(
    changedFiles,
    JEST_TESTS_ONLY_SCOPE_GLOBS,
    JEST_TESTS_ONLY_IGNORE_PATTERNS
  );
}
