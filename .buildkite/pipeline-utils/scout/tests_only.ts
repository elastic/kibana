/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';
import * as path from 'path';
import minimatch from 'minimatch';

/**
 * Documentation-only files inside Scout test scopes that should be ignored when
 * deciding whether a PR's diff is "Scout tests only". A README or markdown change
 * next to a Playwright config is noise — it must not block the fast path nor
 * schedule any Playwright config to run.
 */
export const SCOUT_TESTS_ONLY_NOISE_PATTERNS: readonly string[] = [
  '**/README*',
  '**/*.md',
  '**/CHANGELOG*',
];

/**
 * Path globs that uniquely identify a Scout test scope — i.e. a directory
 * containing a Playwright config and its co-located tests/fixtures/helpers.
 *
 * A "scope" is `<package-root>/test/(scout|scout_<custom>)/(ui|api)`, owning at
 * most two configs:
 *   - <scope>/playwright.config.ts          (single-thread, tests under tests/)
 *   - <scope>/parallel.playwright.config.ts (parallel, tests under parallel_tests/)
 *
 * The `.meta/(ui|api)` patterns cover auto-generated manifests that belong to
 * the matching scope.
 */
export const SCOUT_TESTS_ONLY_PATTERNS: readonly string[] = [
  '**/test/scout/ui/**',
  '**/test/scout/api/**',
  '**/test/scout_*/ui/**',
  '**/test/scout_*/api/**',
  '**/test/scout/.meta/ui/**',
  '**/test/scout/.meta/api/**',
  '**/test/scout_*/.meta/ui/**',
  '**/test/scout_*/.meta/api/**',
];

/**
 * Returns true when EVERY file matches at least one of the given patterns.
 * An empty file list returns false (nothing to gate on).
 */
export function allFilesMatch(files: readonly string[], patterns: readonly string[]): boolean {
  if (files.length === 0) {
    return false;
  }
  return files.every((file) => patterns.some((p) => minimatch(file, p, { dot: true })));
}

/**
 * Returns true when AT LEAST ONE file matches one of the given patterns.
 */
export function anyFileMatches(files: readonly string[], patterns: readonly string[]): boolean {
  return files.some((file) => patterns.some((p) => minimatch(file, p, { dot: true })));
}

/**
 * Captures `<prefix>/test/(scout|scout_<custom>)/(ui|api)/<rest?>` and the
 * `.meta/` variant `<prefix>/test/(scout|scout_<custom>)/.meta/(ui|api)/<rest?>`.
 */
const SCOUT_SCOPE_PATTERN = /^(.+?)\/test\/(scout(?:_[^/]+)?)\/(?:\.meta\/)?(ui|api)(?:\/(.*))?$/;

const PLAYWRIGHT_CONFIG = 'playwright.config.ts';
const PARALLEL_PLAYWRIGHT_CONFIG = 'parallel.playwright.config.ts';

const filterExisting = (configs: readonly string[], repoRoot: string): string[] =>
  configs.filter((rel) => fs.existsSync(path.join(repoRoot, rel)));

/**
 * Map a single changed file path to the Playwright config(s) that own it.
 *
 * Returns 0–2 repo-relative config paths:
 *   - 0 when the file is outside any Scout scope
 *   - 1 when the file is under `tests/` or `parallel_tests/` (single config)
 *   - 1–2 for shared scope files (fixtures, helpers, page objects, .meta, etc.)
 *     filtered against `repoRoot` to drop configs that don't exist on disk.
 */
export function deriveScoutConfigsForFile(file: string, repoRoot: string): string[] {
  const match = file.match(SCOUT_SCOPE_PATTERN);
  if (!match) {
    return [];
  }

  const [, prefix, scoutDir, type, rest = ''] = match;
  const scope = `${prefix}/test/${scoutDir}/${type}`;

  if (rest.startsWith('tests/')) {
    return filterExisting([`${scope}/${PLAYWRIGHT_CONFIG}`], repoRoot);
  }

  if (rest.startsWith('parallel_tests/')) {
    return filterExisting([`${scope}/${PARALLEL_PLAYWRIGHT_CONFIG}`], repoRoot);
  }

  // Shared scope file (fixtures/, helpers, constants, page_objects/, .meta/, ...)
  // or the playwright config itself: map to whichever configs exist in the scope.
  return filterExisting(
    [`${scope}/${PLAYWRIGHT_CONFIG}`, `${scope}/${PARALLEL_PLAYWRIGHT_CONFIG}`],
    repoRoot
  );
}

/**
 * Map a list of changed file paths to the union of owning Playwright configs.
 * The returned set is suitable for `discover-playwright-configs --affected-configs`.
 */
export function deriveScoutConfigsForFiles(
  files: readonly string[],
  repoRoot: string
): Set<string> {
  const configs = new Set<string>();
  for (const file of files) {
    for (const config of deriveScoutConfigsForFile(file, repoRoot)) {
      configs.add(config);
    }
  }
  return configs;
}
