/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Minimatch } from 'minimatch';

/**
 * Scout-tests-only fast path for the Jest/FTR orchestrator.
 *
 * When a PR's diff is exclusively Scout test files (Playwright configs, specs,
 * page objects, fixtures, generated `.meta` manifests, plus harmless markdown
 * noise), no Jest unit/integration or FTR config can plausibly be affected, so
 * the orchestrator skips emitting them entirely. The Scout pipeline still runs
 * its own selective testing in parallel.
 *
 * The Scout-side source of truth for these patterns lives in
 * `@kbn/scout-info`. We deliberately re-declare them here as plain string
 * literals because `pipeline-utils/` is hermetic from the rest of the repo
 * (no `@kbn/*` imports allowed) and must keep its dependency surface tiny.
 * A lockstep Jest test in `kbn-scout-info` reads this file's source and
 * asserts each pattern below appears verbatim — drift will fail CI before
 * it can land.
 *
 * DO NOT EDIT the two arrays below without making the matching change in
 * `src/platform/packages/private/kbn-scout-info/src/paths.ts`.
 */

// LOCKSTEP:scout-info BEGIN
const SCOUT_TESTS_ONLY_NOISE_PATTERNS: readonly string[] = [
  '**/README*',
  '**/*.md',
  '**/CHANGELOG*',
];

const SCOUT_TESTS_ONLY_SCOPE_GLOBS: readonly string[] = [
  '**/test/scout{_*,}/{api,ui}/**',
  '**/test/scout{_*,}/.meta/{api,ui}/**',
];
// LOCKSTEP:scout-info END

// Instance type left inferred — keeps the module portable across minimatch
// type-package variants (legacy @types/minimatch vs. modern bundled types).
const compile = (patterns: readonly string[]) =>
  patterns.map((p) => new Minimatch(p, { dot: true }));

const NOISE = compile(SCOUT_TESTS_ONLY_NOISE_PATTERNS);
const SCOPES = compile(SCOUT_TESTS_ONLY_SCOPE_GLOBS);

const matchesAny = (file: string, matchers: ReturnType<typeof compile>): boolean =>
  matchers.some((m) => m.match(file));

/**
 * True when every changed file is either:
 *  - documentation noise (README, *.md, CHANGELOG*), or
 *  - inside a Scout test scope (`**​/test/scout{_*,}/{api,ui}/**` or its
 *    `.meta/` sibling).
 *
 * Returns `false` for an empty diff or when any meaningful non-Scout file is
 * present, so the caller always falls back to the default test discovery on
 * uncertainty.
 */
export function isScoutTestsOnlyDiff(changedFiles: readonly string[]): boolean {
  let sawMeaningful = false;
  for (const file of changedFiles) {
    if (matchesAny(file, NOISE)) continue;
    sawMeaningful = true;
    if (!matchesAny(file, SCOPES)) return false;
  }
  return sawMeaningful;
}
