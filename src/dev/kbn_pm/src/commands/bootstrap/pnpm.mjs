/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { REPO_ROOT } from '../../lib/paths.mjs';
import { isDirectory } from '../../lib/fs.mjs';
import { run } from '../../lib/spawn.mjs';

export async function areNodeModulesPresent() {
  return await isDirectory(Path.resolve(REPO_ROOT, 'node_modules'));
}

/**
 * Installs project dependencies using pnpm. pnpm is idempotent, so unlike yarn
 * there is no separate integrity gate: a no-op install is cheap and pnpm only
 * changes node_modules when the lockfile or manifests differ.
 *
 * @param {import('src/platform/packages/private/kbn-some-dev-log').SomeDevLog} log
 * @param {{ offline: boolean, quiet: boolean, frozenLockfile: boolean, force: boolean }} options
 * @returns {Promise<void>}
 */
export async function pnpmInstallDeps(log, { offline, quiet, frozenLockfile, force }) {
  const args = ['install', '--config.confirmModulesPurge=false'];
  if (frozenLockfile) args.push('--frozen-lockfile');
  if (offline) args.push('--offline');
  if (force) args.push('--force');
  if (quiet) args.push('--reporter=silent');

  log.info('installing dependencies with pnpm');
  await run('pnpm', args, { cwd: REPO_ROOT, pipe: !quiet });
  log.success('pnpm dependencies installed');

  await run('pnpm', ['exec', 'playwright', 'install'], {
    cwd: REPO_ROOT,
    pipe: false,
    env: {
      PLAYWRIGHT_SKIP_BROWSER_GC: '1',
    },
  });
  log.success('Playwright browsers installed');
}
