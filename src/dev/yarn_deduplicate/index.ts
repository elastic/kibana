/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';
import { REPO_ROOT } from '@kbn/repo-info';

// pnpm has built-in, range-aware deduplication. It only collapses versions when
// the declared ranges allow it and respects pnpm.overrides, so the per-package
// excludes the old yarn-deduplicate needed are no longer required.
const result = spawnSync('pnpm', ['dedupe'], {
  cwd: REPO_ROOT,
  stdio: 'inherit',
  shell: false,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
