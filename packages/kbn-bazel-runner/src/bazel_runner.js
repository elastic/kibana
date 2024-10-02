/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @param {'bazel' | 'ibazel'} runner
 * @param {string[]} args
 * @param {import('./types').BazelRunOptions | undefined} options
 */
// eslint-disable-next-line no-unused-vars
async function runBazelRunner(runner, args, options = undefined) {
  // No bazel
}

/**
 * @param {string[]} args
 * @param {import('./types').BazelRunOptions | undefined} options
 */
async function runBazel(args, options = undefined) {
  return await runBazelRunner('bazel', args, options);
}

/**
 * @param {string[]} args
 * @param {import('./types').BazelRunOptions | undefined} options
 */
async function runIBazel(args, options = undefined) {
  return await runBazelRunner('ibazel', args, {
    ...options,
    env: {
      IBAZEL_USE_LEGACY_WATCHER: '0',
      ...options?.env,
    },
  });
}

module.exports = { runBazel, runIBazel };
