/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Glob patterns excluded from the Scout module graph when computing affected packages.
 * Files matching these patterns cannot affect Scout Playwright test execution, so
 * excluding them prevents docs-only or Jest-test-only PRs from inflating affectedModules
 * and triggering unnecessary Playwright runs.
 *
 * Doc patterns mirror SCOUT_TESTS_ONLY_IGNORE_PATTERNS in @kbn/scout-info.
 */
export const SCOUT_MODULE_GRAPH_IGNORE: readonly string[] = [
  '**/README*',
  '**/*.md',
  '**/CHANGELOG*', // documentation noise
  '**/*.test.ts', // Jest tests — only Jest needs to run, not Playwright
];
