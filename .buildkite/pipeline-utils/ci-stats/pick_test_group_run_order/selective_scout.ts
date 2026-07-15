/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { allChangedFilesInScope } from '../../affected-packages';

/**
 * Scout-tests-only fast path for the Jest/FTR orchestrator.
 *
 * When a PR's diff contains only Scout test files (Playwright configs, specs,
 * generated `.meta` manifests, co-located helpers/constants), no Jest
 * unit/integration or FTR config can be affected, so the orchestrator skips
 * emitting them entirely. The Scout pipeline still runs its own selective
 * testing in parallel.
 *
 * Changes under a Scout `fixtures/` directory are excluded: their entry points
 * can be imported by other plugins, so they're treated as regular changes.
 *
 * The three arrays below duplicate constants in `@kbn/scout-info`'s `paths.ts`
 * (the source of truth) — `pipeline-utils/` may not import `@kbn/*`. A unit test
 * in `kbn-scout-info` fails CI if the copies drift.
 */

const SCOUT_TESTS_ONLY_IGNORE_PATTERNS: readonly string[] = [
  '**/README*',
  '**/*.md',
  '**/CHANGELOG*',
];

const SCOUT_TESTS_ONLY_SCOPE_GLOBS: readonly string[] = [
  '**/test/scout{_*,}/{api,ui}/**',
  '**/test/scout{_*,}/*/{api,ui}/**',
  '**/test/scout{_*,}/.meta/{api,ui}/**',
  '**/test/scout{_*,}/*/.meta/{api,ui}/**',
];

const SCOUT_TESTS_ONLY_EXCLUDE_GLOBS: readonly string[] = [
  '**/test/scout{_*,}/{api,ui}/fixtures/**',
  '**/test/scout{_*,}/*/{api,ui}/fixtures/**',
];

/**
 * Returns `true` only when every changed file is either documentation noise
 * (README, *.md, CHANGELOG*) or sits inside a Scout test scope, excluding
 * `fixtures/` changes. Falls back to `false` on an empty diff or anything
 * unrecognised, so unrelated changes keep using the default test discovery.
 */
export function isScoutTestsOnlyDiff(changedFiles: readonly string[]): boolean {
  return allChangedFilesInScope(
    changedFiles,
    SCOUT_TESTS_ONLY_SCOPE_GLOBS,
    SCOUT_TESTS_ONLY_IGNORE_PATTERNS,
    SCOUT_TESTS_ONLY_EXCLUDE_GLOBS
  );
}
