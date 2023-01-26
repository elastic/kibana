/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '../lib/paths.mjs';
import { dedent } from '../lib/indent.mjs';
import { cleanPaths } from '../lib/clean.mjs';
import * as Bazel from '../lib/bazel.mjs';
import { findPluginCleanPaths, readCleanPatterns } from '../lib/find_clean_paths.mjs';

/** @type {import('../lib/command').Command} */
export const command = {
  name: 'reset',
  description:
    'Deletes node_modules and output directories, resets internal and disk caches, and stops Bazel server',
  reportTimings: {
    group: 'scripts/kbn reset',
    id: 'total',
  },
  flagsHelp: `
    --quiet              Prevent logging more than basic success/error messages
  `,
  async run({ args, log }) {
    log.warning(dedent`
      In most cases, 'yarn kbn clean' is all that should be needed to recover a consistent state when
      problems arise. However for the rare cases where something get corrupt on node_modules you might need this command.
      If you think you need to use this command very often (which is not normal), please let us know.
    `);

    await cleanPaths(log, [
      Path.resolve(REPO_ROOT, 'node_modules'),
      Path.resolve(REPO_ROOT, 'x-pack/node_modules'),
      ...readCleanPatterns(REPO_ROOT),
      ...(await findPluginCleanPaths(log)),
    ]);

    if (await Bazel.isInstalled(log)) {
      const quiet = args.getBooleanValue('quiet');
      await Bazel.expungeCache(log, { quiet });
      await Bazel.cleanDiskCache(log);
    }
  },
};
