/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

<<<<<<< HEAD
/**
 * Produces the code-changes file consumed by the Scout selective-testing CLI.
 *
 * This script is intentionally thin: its only job is to bridge between
 * `pipeline-utils` (Buildkite-side helpers that compute git diffs and the
 * @kbn/ module graph) and `node scripts/scout discover-playwright-configs
 * --code-changes`, which owns all Scout selective-testing decisions
 * (critical-files check, tests-only fast path, dependency-tree fallback).
 *
 * Usage:
 *   ts-node resolve_selective_testing.ts <mergeBase> <outPath>
 *
 * Args:
 *   mergeBase  — git ref to diff against (required)
 *   outPath    — output JSON path (required)
 *
 * Output (file):
 *   {
 *     "mergeBase": "<sha>",
 *     "changedFiles": ["src/...", ...],
 *     "affectedModules": ["@kbn/foo", ...]
 *   }
 */

import fs from 'node:fs';
import path from 'node:path';
import { ToolingLog } from '@kbn/tooling-log';
import { expandWithImplicitConsumers } from './scout_implicit_consumers';
import { getAffectedPackages, listChangedFiles } from '#pipeline-utils';

const log = new ToolingLog({ level: 'info', writeTo: process.stderr });

const [mergeBase, outPath] = process.argv.slice(2);

if (!mergeBase || !outPath) {
  console.error('Usage: resolve_selective_testing.ts <mergeBase> <outPath>');
=======
import fs from 'node:fs';
import path from 'node:path';
import {
  getAffectedPackages,
  listChangedFiles,
  touchedCriticalFiles,
  CRITICAL_FILES_SCOUT,
} from '#pipeline-utils';

const mergeBase = process.env.AFFECTED_MERGE_BASE;
const outPath = process.env.AFFECTED_MODULES_FILE;

if (!mergeBase) {
  console.error('AFFECTED_MERGE_BASE environment variable is required');
  process.exit(1);
}

if (!outPath) {
  console.error('AFFECTED_MODULES_FILE environment variable is required');
>>>>>>> 9.4
  process.exit(1);
}

(async () => {
  // List changed files once; reuse for both affected-packages and critical-files check.
  const changedFiles = listChangedFiles({ mergeBase, commit: 'HEAD' });

<<<<<<< HEAD
  // Compute affected @kbn/ modules (replaces the legacy `list_affected` binary).
  // Overlay implicit runtime-registry consumers — see scout_implicit_consumers.ts.
  const affectedPackages = expandWithImplicitConsumers(
    await getAffectedPackages(mergeBase, {
      strategy: 'git',
      includeDownstream: true,
      ignoreUncategorizedChanges: true,
    }),
    changedFiles,
    log
  );

  const codeChanges = {
    mergeBase,
    changedFiles: [...changedFiles].sort(),
    affectedModules: [...affectedPackages].sort(),
  };

  // Write the code-changes JSON consumed by `scout resolve-testing-scope`.
  const resolvedOutPath = path.resolve(outPath);
  fs.mkdirSync(path.dirname(resolvedOutPath), { recursive: true });
  fs.writeFileSync(resolvedOutPath, JSON.stringify(codeChanges, null, 2));
=======
  // Write affected modules JSON (replaces the list_affected binary call).
  const affectedPackages = await getAffectedPackages(mergeBase, {
    strategy: 'git',
    includeDownstream: true,
    ignoreUncategorizedChanges: true,
  });
  const resolvedOutPath = path.resolve(outPath);
  fs.mkdirSync(path.dirname(resolvedOutPath), { recursive: true });
  fs.writeFileSync(resolvedOutPath, JSON.stringify(Array.from(affectedPackages).sort(), null, 2));

  // Top-level check: if critical Scout files were touched, the all Scout tests should run.
  const criticalTouched = touchedCriticalFiles(changedFiles, CRITICAL_FILES_SCOUT);
  if (criticalTouched) {
    console.warn(
      'Critical Scout files changed — selective testing will be skipped (full suite run)'
    );
  }

  // Output true/false to stdout for the shell script to capture.
  process.stdout.write(criticalTouched ? 'true' : 'false');
>>>>>>> 9.4
})();
