/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
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
 * Detect a node_modules left behind by a prior yarn install. Installing pnpm on
 * top of it corrupts package state (e.g. cypress' postinstall fails), so callers
 * should force a clean reinstall when this returns true.
 * @returns {boolean}
 */
export function hasYarnInstallLeftovers() {
  return Fs.existsSync(Path.resolve(REPO_ROOT, 'node_modules', '.yarn-integrity'));
}

/**
 * Verify pnpm is available before we spawn it, and warn on version drift.
 * We deliberately don't ship a package.json "packageManager" field: while the
 * repo is mid-migration it still relies on yarn (the `yarn kbn` entrypoint and
 * many CI scripts), and that field makes yarn refuse to run. So we detect pnpm
 * ourselves and point devs at corepack, pinning from "engines.pnpm".
 *
 * @param {import('src/platform/packages/private/kbn-some-dev-log').SomeDevLog} log
 */
export function ensurePnpmAvailable(log) {
  const required = getRequiredPnpmVersion();
  const { error, status, stdout } = ChildProcess.spawnSync('pnpm', ['--version'], {
    encoding: 'utf8',
  });

  if (error || status !== 0) {
    log.error(
      dedent`
        pnpm is required to bootstrap Kibana but wasn't found on your PATH.

        Kibana provisions pnpm through corepack (bundled with Node.js), pinning the version from
        package.json "engines". Enable it once with:

          corepack enable
          corepack prepare pnpm@${required} --activate

        then re-run '(yarn|pnpm) kbn bootstrap'.
      `
    );
    process.exit(1);
  }

  // ponytail: only compares the major version, not the full `~` range, to avoid
  // pulling a semver parser into kbn_pm (which must run before bootstrap installs deps).
  const current = stdout.trim();
  if (required && majorOf(current) !== majorOf(required)) {
    log.warning(
      dedent`
        Detected pnpm v${current} but Kibana expects v${required} (package.json "engines.pnpm").
        A mismatched major version can cause lockfile/install incompatibilities. Pin it with:

          corepack prepare pnpm@${required} --activate
      `
    );
  }
}

/**
 * Read the pinned pnpm version from package.json "engines" (e.g. "~11.21.0" -> "11.21.0").
 * @returns {string}
 */
function getRequiredPnpmVersion() {
  try {
    const pkg = JSON.parse(Fs.readFileSync(Path.resolve(REPO_ROOT, 'package.json'), 'utf8'));
    return String(pkg.engines?.pnpm ?? '').replace(/^\D*/, '');
  } catch {
    return '';
  }
}

/**
 * @param {string} version
 * @returns {string}
 */
function majorOf(version) {
  return version.split('.')[0];
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
