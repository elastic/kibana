/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { spawnSync } from 'child_process';
import { REPO_ROOT } from '@kbn/repo-info';

// Not reachable through `require.resolve`: the bin isn't listed in vitest's package exports.
const VITEST_BIN = Path.resolve(REPO_ROOT, 'node_modules/vitest/vitest.mjs');

const VITEST_COMMANDS = new Set(['run', 'watch', 'dev', 'related', 'list', 'bench', 'init']);

/**
 * Run the Vitest CLI from the repo root, where `vitest.config.ts` lists every migrated package
 * as a project. Defaults to `vitest run`; pass `watch` (or any other Vitest command) to override.
 */
export function runVitest(argv: string[] = process.argv.slice(2)): void {
  const args = VITEST_COMMANDS.has(argv[0]) ? argv : ['run', ...argv];
  const { status, error } = spawnSync(process.execPath, [VITEST_BIN, ...args], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });

  if (error) {
    throw error;
  }

  process.exitCode = status ?? 1;
}
