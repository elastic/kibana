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

// remove the yarn integrity file if it exists
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

// yarn integration checkers
async function areNodeModulesPresent() {
  return await isDirectory(Path.resolve(REPO_ROOT, 'node_modules'));
}

export async function haveNodeModulesBeenManuallyDeleted() {
  return !(await areNodeModulesPresent());
}

/**
 * Installs project dependencies, using yarn
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 * @param {{offline: boolean, quiet:boolean } } options
 * @returns {Promise<void>}
 */
export async function yarnInstallDeps(log, { offline, quiet }) {
  log.info('installing node dependencies with yarn');
  const args = ['install', '--non-interactive'];
  if (offline) args.push('--offline');
  if (quiet) args.push('--silent');
  await run('yarn', args, { cwd: process.cwd(), pipe: true });

  await run('yarn', ['playwright', 'install'], {
    cwd: process.cwd(),
    pipe: true,
  });
  log.success('Playwright browsers installed');
}
