/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dedent } from '../lib/indent.mjs';
import { cleanPaths } from '../lib/clean.mjs';
import * as Bazel from '../lib/bazel.mjs';
import { findPluginCleanPaths } from '../lib/find_clean_paths.mjs';

/** @type {import('../lib/command').Command} */
export const command = {
  name: 'clean',
  description: 'Deletes output directories and resets internal caches',
  reportTimings: {
    group: 'scripts/kbn clean',
    id: 'total',
  },
  flagsHelp: `
    --quiet              Prevent logging more than basic success/error messages
  `,
  async run({ args, log }) {
    log.warning(dedent`
      This command is only necessary for the circumstance where you need to recover a consistent
      state when problems arise. If you need to run this command often, please let us know by
      filling out this form: https://ela.st/yarn-kbn-clean.

      Please note it might not solve problems with node_modules. To solve problems around node_modules
      you might need to run 'yarn kbn reset'.
    `);

    await cleanPaths(log, await findPluginCleanPaths(log));

    // Runs Bazel soft clean
    if (await Bazel.isInstalled(log)) {
      await Bazel.clean(log, {
        quiet: args.getBooleanValue('quiet'),
      });
    }
  },
};
