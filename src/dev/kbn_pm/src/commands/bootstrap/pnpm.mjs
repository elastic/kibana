/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import ChildProcess from 'child_process';

import { REPO_ROOT } from '../../lib/paths.mjs';
import { isDirectory } from '../../lib/fs.mjs';
import { cleanPaths } from '../../lib/clean.mjs';
import { dedent } from '../../lib/indent.mjs';
import { run } from '../../lib/spawn.mjs';

export async function areNodeModulesPresent() {
  return await isDirectory(Path.resolve(REPO_ROOT, 'node_modules'));
}

/**
 * Fail fast with an actionable message when pnpm isn't on the PATH. The version
 * is pinned via package.json "packageManager", which corepack (and pnpm itself)
 * read to enforce the exact version, so enabling corepack is all a developer needs.
 *
 * @param {import('src/platform/packages/private/kbn-some-dev-log').SomeDevLog} log
 */
export function ensurePnpmAvailable(log) {
  const { error, status } = ChildProcess.spawnSync('pnpm', ['--version'], { encoding: 'utf8' });
  if (!error && status === 0) {
    return;
  }

  log.error(
    dedent`
      pnpm is required to bootstrap Kibana but wasn't found on your PATH.

      Kibana pins pnpm via package.json "packageManager" and runs it through corepack
      (bundled with Node.js). Enable it once with:

        corepack enable

      then re-run 'yarn kbn bootstrap' — corepack fetches the pinned pnpm automatically.
    `
  );
  process.exit(1);
}

/**
 * Installs project dependencies using pnpm. pnpm is idempotent, so unlike yarn
 * there is no separate integrity gate: a no-op install is cheap and pnpm only
 * changes node_modules when the lockfile or manifests differ.
 *
 * When `force` is set we delete node_modules first, because `pnpm install --force`
 * only re-resolves/re-fetches and still reports "Already up to date" without
 * rebuilding node_modules when the lockfile is already satisfied.
 *
 * @param {import('src/platform/packages/private/kbn-some-dev-log').SomeDevLog} log
 * @param {{ offline: boolean, quiet: boolean, frozenLockfile: boolean, force: boolean }} options
 * @returns {Promise<void>}
 */
export async function pnpmInstallDeps(log, { offline, quiet, frozenLockfile, force }) {
  if (force) {
    log.info('--force-install: removing node_modules to force a clean reinstall');
    await cleanPaths(log, [
      Path.resolve(REPO_ROOT, 'node_modules'),
      Path.resolve(REPO_ROOT, 'x-pack/node_modules'),
    ]);
  }

  const args = ['install', '--config.confirmModulesPurge=false'];
  if (frozenLockfile) args.push('--frozen-lockfile');
  if (offline) args.push('--offline');
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
