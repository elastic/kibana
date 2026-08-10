/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Minimatch } from 'minimatch';
import { SCOUT_TESTS_ONLY_IGNORE_PATTERNS, SCOUT_TESTS_ONLY_SCOPE_GLOBS } from './selective_scout';

/**
 * Cypress trigger relevance for the PR pipeline.
 *
 * Cypress suites are added to the PR pipeline by path matchers that cover
 * whole plugin directories, so changes inside Scout test trees (which live
 * inside plugins) or FTR test trees trigger every matching Cypress suite
 * even though neither tree can affect Cypress: Scout files aren't importable
 * from Cypress code, and FTR trees only share the surfaces that are
 * explicitly carved out in `CYPRESS_RELEVANT_EXCLUDE_GLOBS`.
 *
 * The PR pipeline filters such changes out before evaluating the Cypress
 * suites' path matchers, so they only see changes that can actually affect
 * Cypress. Label triggers (e.g. `ci:all-cypress-suites`) are not affected.
 */

/**
 * FTR test roots, plus the FTR manifests that only drive the Jest/FTR
 * orchestrator (FTR migrations always touch them; Cypress never reads them).
 */
const FTR_TEST_TREE_SCOPE_GLOBS: readonly string[] = [
  'src/platform/test/**',
  'x-pack/platform/test/**',
  'x-pack/solutions/*/test/**',
  '.buildkite/ftr-manifests/**',
];

/**
 * Files inside the FTR test roots that Cypress runs do consume — changes here
 * must keep the Cypress suites on:
 * - Cypress suites and their FTR-runner configs live inside the FTR roots
 *   (`security_solution_cypress`, `osquery_cypress`, `defend_workflows_cypress`,
 *   `fleet_cypress`).
 * - `security_solution_cypress` loads es archives from the shared `fixtures/`
 *   trees via its es_archiver Cypress tasks.
 * - The Cypress FTR-runner configs extend `@kbn/test-suites-src/common/config`
 *   and `@kbn/test-suites-xpack-platform`'s `functional/config.base` /
 *   `serverless/shared/config.base`, which import their own services and
 *   page objects.
 */
const CYPRESS_RELEVANT_EXCLUDE_GLOBS: readonly string[] = [
  '**/*cypress*/**',
  'src/platform/test/common/**',
  'x-pack/platform/test/fixtures/**',
  'x-pack/platform/test/functional/config.base*',
  'x-pack/platform/test/functional/services/**',
  'x-pack/platform/test/functional/page_objects/**',
  'x-pack/platform/test/serverless/fixtures/**',
  'x-pack/platform/test/serverless/shared/**',
  'x-pack/solutions/*/test/fixtures/**',
];

const compileMatchers = (patterns: readonly string[]) =>
  patterns.map((pattern) => new Minimatch(pattern, { dot: true }));

const matchesAny = (path: string, matchers: ReturnType<typeof compileMatchers>): boolean =>
  matchers.some((matcher) => matcher.match(path));

const ignoreMatchers = compileMatchers(SCOUT_TESTS_ONLY_IGNORE_PATTERNS);
const excludeMatchers = compileMatchers(CYPRESS_RELEVANT_EXCLUDE_GLOBS);
const scopeMatchers = compileMatchers([
  ...SCOUT_TESTS_ONLY_SCOPE_GLOBS,
  ...FTR_TEST_TREE_SCOPE_GLOBS,
]);

/**
 * Returns `false` when the changed path cannot affect Cypress suites: either
 * documentation noise (README, *.md, CHANGELOG* — consistent with the PR
 * pipeline's `skip_ci_on_only_changed` policy) or a file inside a Scout or
 * FTR test tree that Cypress does not consume. Anything unrecognised is
 * treated as relevant, so unrelated changes keep the Cypress suites' default
 * path matchers in charge.
 */
export function isCypressRelevantPath(path: string): boolean {
  if (matchesAny(path, ignoreMatchers)) {
    return false;
  }
  if (matchesAny(path, excludeMatchers)) {
    return true;
  }
  return !matchesAny(path, scopeMatchers);
}
