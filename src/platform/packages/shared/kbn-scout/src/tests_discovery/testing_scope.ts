/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { minimatch } from 'minimatch';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  CRITICAL_FILES_SCOUT,
  SCOUT_TESTS_ONLY_NOISE_PATTERNS,
  SCOUT_TESTS_ONLY_SCOPE_GLOBS,
  SCOUT_TEST_SCOPE_PATTERN,
} from '@kbn/scout-info';
import type { CodeChanges } from './code_changes';

const PLAYWRIGHT_CONFIG = 'playwright.config.ts';
const PARALLEL_PLAYWRIGHT_CONFIG = 'parallel.playwright.config.ts';

const matchesAny = (file: string, patterns: readonly string[]): boolean =>
  patterns.some((p) => minimatch(file, p, { dot: true }));

const filterExisting = (configs: readonly string[], repoRoot: string): string[] =>
  configs.filter((rel) => fs.existsSync(path.join(repoRoot, rel)));

/**
 * Returns true when at least one changed file matches the Scout critical-files list.
 * A critical-files hit forces a full Scout suite run (selective testing skipped).
 */
export const criticalScoutFilesTouched = (changedFiles: readonly string[]): boolean =>
  changedFiles.some((file) => matchesAny(file, CRITICAL_FILES_SCOUT));

/**
 * Returns true when, after dropping noise files (READMEs, markdown, changelogs),
 * every remaining changed file lives inside a Scout test scope.
 *
 * Empty diffs (or diffs that contain only noise) do NOT qualify — there is
 * nothing to fast-path.
 */
export const isScoutTestsOnlyDiff = (changedFiles: readonly string[]): boolean => {
  const meaningful = changedFiles.filter(
    (file) => !matchesAny(file, SCOUT_TESTS_ONLY_NOISE_PATTERNS)
  );
  if (meaningful.length === 0) {
    return false;
  }
  return meaningful.every((file) => matchesAny(file, SCOUT_TESTS_ONLY_SCOPE_GLOBS));
};

/**
 * Map a single changed file path to the Playwright config(s) that own it.
 *
 * Returns 0–2 repo-relative config paths:
 *   - 0 when the file is outside any Scout scope
 *   - 1 when the file is under `tests/` or `parallel_tests/` (single owning config)
 *   - 1–2 for shared scope files (fixtures, helpers, page objects, .meta/, the
 *     config file itself) filtered against `repoRoot` to drop configs that
 *     don't exist on disk.
 *
 * The resolver never crosses ui ↔ api or scout ↔ scout_<custom> scopes.
 */
export const deriveScoutConfigsForFile = (file: string, repoRoot: string): string[] => {
  const match = file.match(SCOUT_TEST_SCOPE_PATTERN);
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
};

/**
 * Map a list of changed file paths to the union of owning Playwright configs.
 * The returned set is suitable for affected-configs filtering in
 * `discover-playwright-configs`.
 */
export const deriveScoutConfigsForFiles = (
  files: readonly string[],
  repoRoot: string
): Set<string> => {
  const configs = new Set<string>();
  for (const file of files) {
    for (const config of deriveScoutConfigsForFile(file, repoRoot)) {
      configs.add(config);
    }
  }
  return configs;
};

/**
 * Shape-agnostic outcome of the Scout selective-testing decision tree. Consumers
 * (e.g. discover-playwright-configs, create-test-tracks) translate the scope
 * into their own filtering of test items.
 *
 *   - 'full'             : run everything (selective testing disabled, or the
 *                          diff touches a critical Scout file).
 *   - 'tests-only'       : run only the Playwright configs whose owning scope
 *                          contains a changed file. `affectedConfigPaths` is
 *                          repo-relative.
 *   - 'dependency-tree'  : run configs whose owning @kbn/ module appears in
 *                          `affectedModuleIds` (graph-traversal mode).
 */
export type ScoutTestingScope =
  | { kind: 'full'; reason: 'selective-disabled' | 'critical-files' }
  | { kind: 'tests-only'; affectedConfigPaths: ReadonlySet<string> }
  | { kind: 'dependency-tree'; affectedModuleIds: ReadonlySet<string> };

/**
 * Decide which Scout testing scope to apply for a given diff.
 *
 * The function is intentionally pure with respect to data shapes: it takes a
 * `CodeChanges` object and returns a discriminated `ScoutTestingScope` that
 * any consumer (configs CLI, tracks CLI, or future skip-checks) can dispatch on.
 *
 * Decision tree (only when `selectiveTesting` is true and `codeChanges` is set):
 *   1. Critical Scout files touched      -> { kind: 'full', reason: 'critical-files' }
 *   2. Diff is exclusively Scout tests   -> { kind: 'tests-only', affectedConfigPaths }
 *   3. Otherwise                         -> { kind: 'dependency-tree', affectedModuleIds }
 *
 * When selective testing is disabled OR no code-changes file was provided, the
 * scope is `{ kind: 'full', reason: 'selective-disabled' }`. Marking semantics
 * (per-item `isAffected`) are deliberately NOT part of the scope — consumers
 * derive that from `codeChanges.affectedModules` independently.
 */
export const resolveScoutTestingScope = (
  codeChanges: CodeChanges | null,
  selectiveTesting: boolean,
  log: ToolingLog,
  repoRoot: string = REPO_ROOT
): ScoutTestingScope => {
  if (!selectiveTesting || !codeChanges) {
    return { kind: 'full', reason: 'selective-disabled' };
  }

  if (criticalScoutFilesTouched(codeChanges.changedFiles)) {
    log.warning('Selective testing: critical Scout files touched — running full Scout suite');
    return { kind: 'full', reason: 'critical-files' };
  }

  if (isScoutTestsOnlyDiff(codeChanges.changedFiles)) {
    const affectedConfigPaths = deriveScoutConfigsForFiles(codeChanges.changedFiles, repoRoot);
    log.info(
      `Selective testing: tests-only fast path — ${affectedConfigPaths.size} affected Playwright config(s)`
    );
    return { kind: 'tests-only', affectedConfigPaths };
  }

  const affectedModuleIds: ReadonlySet<string> = new Set(codeChanges.affectedModules);
  log.info(
    `Selective testing: dependency-tree mode — ${affectedModuleIds.size} affected module(s)`
  );
  return { kind: 'dependency-tree', affectedModuleIds };
};

/**
 * Serialised, file-friendly view of a `ScoutTestingScope`. This is the public
 * hand-off contract published by `scout resolve-testing-scope` and consumed by
 * every downstream step (configs CLI, lanes CLI, FTR/Jest skip check, ...).
 *
 * Field semantics:
 *   - `kind` / `reason`        : the decision (mirrors ScoutTestingScope).
 *   - `skipNonScoutTests`      : pre-computed boolean; true only for
 *                                `kind: 'tests-only'`. Downstream short-circuits
 *                                read this without re-implementing dispatch.
 *   - `affectedModules`        : ALWAYS present (sorted, possibly empty). Used
 *                                both as the dependency-tree filter set AND for
 *                                generic "isAffected" labeling regardless of kind.
 *   - `affectedConfigs`        : present only when `kind === 'tests-only'`. The
 *                                exact set of Playwright configs to run.
 */
export interface SerializedScoutTestingScope {
  kind: ScoutTestingScope['kind'];
  reason?: 'selective-disabled' | 'critical-files';
  skipNonScoutTests: boolean;
  affectedModules: readonly string[];
  affectedConfigs?: readonly string[];
}

/**
 * Convert a `ScoutTestingScope` into a JSON-serialisable shape suitable for
 * sharing across pipeline steps (e.g. as a Buildkite artifact).
 *
 * `affectedModules` is sourced from the original `CodeChanges` and is always
 * included — even when the scope is `full` or `tests-only` — so consumers
 * can mark items as "affected" for CI labeling regardless of which selective-
 * testing branch is active.
 */
export const serializeScoutTestingScope = (
  scope: ScoutTestingScope,
  affectedModules: ReadonlySet<string>
): SerializedScoutTestingScope => {
  const sortedModules = Array.from(affectedModules).sort();
  switch (scope.kind) {
    case 'full':
      return {
        kind: 'full',
        reason: scope.reason,
        skipNonScoutTests: false,
        affectedModules: sortedModules,
      };
    case 'tests-only':
      return {
        kind: 'tests-only',
        skipNonScoutTests: true,
        affectedModules: sortedModules,
        affectedConfigs: Array.from(scope.affectedConfigPaths).sort(),
      };
    case 'dependency-tree':
      return {
        kind: 'dependency-tree',
        skipNonScoutTests: false,
        // Note: scope.affectedModuleIds === affectedModules in this branch.
        affectedModules: Array.from(scope.affectedModuleIds).sort(),
      };
  }
};

/**
 * Write the serialised scope to disk, creating the parent directory if needed.
 * Used by `scout resolve-testing-scope` to publish a tiny, stable hand-off
 * artifact for other pipeline steps (configs/lanes filter, FTR/Jest skip).
 */
export const writeScoutTestingScope = (
  scope: ScoutTestingScope,
  affectedModules: ReadonlySet<string>,
  outputPath: string
): void => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(serializeScoutTestingScope(scope, affectedModules), null, 2)}\n`
  );
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isSerializedScoutTestingScope = (value: unknown): value is SerializedScoutTestingScope => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (
    candidate.kind !== 'full' &&
    candidate.kind !== 'tests-only' &&
    candidate.kind !== 'dependency-tree'
  ) {
    return false;
  }
  if (typeof candidate.skipNonScoutTests !== 'boolean') return false;
  if (!isStringArray(candidate.affectedModules)) return false;
  if (candidate.affectedConfigs !== undefined && !isStringArray(candidate.affectedConfigs)) {
    return false;
  }
  return true;
};

/**
 * Read and validate a testing-scope JSON file produced by `scout
 * resolve-testing-scope`. Throws (via createFailError) on missing/invalid
 * input — downstream consumers must not silently fall back to a wrong mode.
 */
export const readScoutTestingScope = (filePath: string): SerializedScoutTestingScope => {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(REPO_ROOT, filePath);
  let content: string;
  try {
    content = fs.readFileSync(absolutePath, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw createFailError(`Failed to read testing-scope file '${filePath}': ${message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw createFailError(`Testing-scope file is not valid JSON ('${filePath}'): ${message}`);
  }

  if (!isSerializedScoutTestingScope(parsed)) {
    throw createFailError(
      `Testing-scope file '${filePath}' must contain { kind: 'full'|'tests-only'|'dependency-tree', skipNonScoutTests: boolean, affectedModules: string[], affectedConfigs?: string[] }`
    );
  }

  return parsed;
};
