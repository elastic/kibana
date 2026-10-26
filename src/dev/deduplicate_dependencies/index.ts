/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createPatch } from 'diff';
import { REPO_ROOT } from '@kbn/repo-info';
import { reconcileLockfile } from './lockfile_changes';

// pnpm has built-in, range-aware deduplication. It only collapses versions when
// the declared ranges allow it and respects pnpm.overrides, so the per-package
// excludes the old yarn-deduplicate needed are no longer required.
const lockfilePath = join(REPO_ROOT, 'pnpm-lock.yaml');
const originalLockfile = readFileSync(lockfilePath, 'utf8');
const result = spawnSync('pnpm', ['dedupe'], {
  cwd: REPO_ROOT,
  stdio: 'inherit',
  shell: false,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const change = reconcileLockfile(lockfilePath, originalLockfile);
if (change.kind === 'informational') {
  const category = change.deprecatedPackages.length > 0 ? 'deprecation notices' : 'formatting';
  process.stdout.write(`Ignoring pnpm-lock.yaml ${category} changes.\n`);
  if (change.deprecatedPackages.length > 0) {
    process.stdout.write(`Affected packages: ${change.deprecatedPackages.join(', ')}\n`);
  }
} else if (change.kind === 'material') {
  const lines = createPatch('pnpm-lock.yaml', originalLockfile, readFileSync(lockfilePath, 'utf8'))
    .trimEnd()
    .split('\n');
  process.stderr.write('pnpm dedupe changed pnpm-lock.yaml beyond package deprecation metadata.\n');
  process.stderr.write(`${lines.slice(0, 80).join('\n')}\n`);
  if (lines.length > 80) {
    process.stderr.write(`... ${lines.length - 80} more diff lines omitted\n`);
  }
}
