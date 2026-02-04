/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';

import { REPO_ROOT } from '../../lib/paths.mjs';
import { maybeRealpath, isFile, isDirectory } from '../../lib/fs.mjs';
import { run } from '../../lib/spawn.mjs';

// yarn integrity file checker
export async function removeYarnIntegrityFileIfExists() {
  try {
    const nodeModulesRealPath = await maybeRealpath(Path.resolve(REPO_ROOT, 'node_modules'));
    const yarnIntegrityFilePath = Path.resolve(nodeModulesRealPath, '.yarn-integrity');

    // check if the file exists and delete it in that case
    if (await isFile(yarnIntegrityFilePath)) {
      await Fsp.unlink(yarnIntegrityFilePath);
    }
  } catch {
    // no-op
  }
}

export async function areNodeModulesPresent() {
  return await isDirectory(Path.resolve(REPO_ROOT, 'node_modules'));
}

/**
 * Installs project dependencies, using yarn
 * @param {import('src/platform/packages/private/kbn-some-dev-log').SomeDevLog} log
 * @param {{offline: boolean, quiet:boolean } } options
 * @returns {Promise<void>}
 */
export async function yarnInstallDeps(log, { offline, quiet }) {
  const args = ['install', '--non-interactive'];
  if (offline) args.push('--offline');
  if (quiet) args.push('--silent');

  log.info('installing dependencies with yarn');
  await run('yarn', args, { cwd: process.cwd(), pipe: !quiet });
  log.success('yarn dependencies installed');

  await run('yarn', ['playwright', 'install'], {
    cwd: process.cwd(),
    pipe: false,
    env: {
      PLAYWRIGHT_SKIP_BROWSER_GC: '1',
    },
  });
  log.success('Playwright browsers installed');
}

/**
 * Runs allowlisted install scripts (.yarnrc ignore-scripts is enabled)
 * @param {import('src/platform/packages/private/kbn-some-dev-log').SomeDevLog} log
 * @param {{ quiet: boolean }} options
 * @returns {Promise<void>}
 */
export async function runInstallScripts(log, { quiet }) {
  log.info('running allowlisted install scripts');
  await run('node', ['scripts/yarn_install_scripts.js', 'run'], {
    cwd: REPO_ROOT,
    pipe: !quiet,
  });
  log.success('install scripts completed');
}

/**
 * Checks if the installed state adheres to the integrity checksums from the yarn.lock file
 * @param {import('src/platform/packages/private/kbn-some-dev-log').SomeDevLog} log
 * @returns {Promise<boolean>}
 */
export async function checkYarnIntegrity(log) {
  try {
    await run('yarn', ['check', '--integrity'], { cwd: process.cwd() });
    log.success('yarn.lock integrity check passed - no need to update');
    return true;
  } catch (error) {
    log.warning(`yarn.lock integrity didn't check out, reinstalling...`);
    log.debug('yarn check error:', error);
    return false;
  }
}
