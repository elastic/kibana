/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from './spawn.mjs';
import { REPO_ROOT } from './paths.mjs';
import path from 'path';

/**
 * Builds a single package using its npm build script
 * @param {string} packagePath
 * @param {{quiet: boolean, dist:boolean, log: import('@kbn/some-dev-log/src/some_dev_log').SomeDevLog}} options
 * @returns {Promise<void>}
 */
export async function buildPackage(packagePath, { log, quiet, dist }) {
  log.info(`build package @ ${packagePath}`);

  await run('yarn', ['build'].concat(dist ? ['--dist'] : []), {
    env: {
      ...process.env,
      REPO_ROOT,
    },
    cwd: path.resolve(REPO_ROOT, packagePath),
    pipe: !quiet,
  });
}

/**
 * Runs the build script in watch mode for a single package
 * @param {string} packagePath
 * @param {{quiet: boolean}} options
 * @returns {Promise<void>}
 */
export async function watchPackage(packagePath, { quiet }) {
  await run('yarn', ['build', '--watch'], {
    env: {
      ...process.env,
      REPO_ROOT,
    },
    cwd: path.resolve(REPO_ROOT, packagePath),
    pipe: !quiet,
  });
}
