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
 * Builds a set of packages with NX, relying on an existing build target
 * @param {string[]} packages
 * @param {{quiet: boolean, disableNXCache: boolean, log: any}} options
 * @returns {Promise<unknown>}
 */
export async function buildPackages(packages, options) {
  if (packages.length === 0) {
    throw new Error('No packages to build');
  }

  const BUILD_TARGET = 'build';
  const projectFilterFlags = packages.map((packageName) => `--projects="${packageName}"`);

  const flags = [
    `--target=${BUILD_TARGET}`,
    ...projectFilterFlags,
    '--verbose', // NX is quite quiet by default, verbose doesn't hurt
  ];

  if (options.disableNXCache) {
    flags.push('--skipNxCache');
  }

  const command = ['nx', 'run-many', ...flags].join(' ');
  options.log.info(`Running ${command}`);

  return run('nx', ['run-many', ...flags], {
    cwd: REPO_ROOT,
    pipe: !options.quiet,
  });
}

/**
 * Runs the build script in watch mode for a single package
 * @param {string} packageName
 * @param {{quiet: boolean}} options
 * @returns {Promise<void>}
 */
export async function watchPackage(packageName, { quiet }) {
  await run('yarn', ['build', '--watch'], {
    cwd: path.resolve(REPO_ROOT, 'packages', packageName),
    pipe: !quiet,
  });
}
