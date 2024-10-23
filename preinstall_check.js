/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

(() => {
  const isUsingNpm = process.env.npm_config_git !== undefined;

  if (isUsingNpm) {
    throw new Error(`Use Yarn instead of npm, see Kibana's contributing guidelines`);
  }

  // The value of the `npm_config_argv` env for each command:
  //
  // - `npm install`: '{"remain":[],"cooked":["install"],"original":[]}'
  // - `yarn`: '{"remain":[],"cooked":["install"],"original":[]}'
  // - `yarn kbn bootstrap`: '{"remain":[],"cooked":["run","kbn"],"original":["kbn","bootstrap"]}'
  const rawArgv = process.env.npm_config_argv;

  if (rawArgv === undefined) {
    return;
  }

  try {
    const argv = JSON.parse(rawArgv);

    // allow dependencies to be installed with `yarn kbn bootstrap` or `bazel run @nodejs//:yarn` (called under the hood by bazel)
    if (argv.cooked.includes('kbn') || !!process.env.BAZEL_YARN_INSTALL) {
      // all good, trying to install deps using `kbn` or bazel directly
      return;
    }

    if (argv.cooked.includes('install')) {
      console.log('\nWARNING: When installing dependencies, prefer `yarn kbn bootstrap`\n');
    }
  } catch (e) {
    // if it fails we do nothing, as this is just intended to be a helpful message
  }
})();
