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
import { collectBazelPaths, findPluginCleanPaths } from '../lib/find_clean_paths.mjs';
import Path from 'path';
import { REPO_ROOT } from '../lib/paths.mjs';

/** @type {import('../lib/command').Command} */
export const command = {
  name: 'clean',
  description: 'Deletes output directories and resets internal caches',
  reportTimings: {
    group: 'scripts/kbn clean',
    id: 'total',
  },
  flagsHelp: `
    --allow-root         Required supplementary flag if you're running this command as root.
    --quiet              Prevent logging more than basic success/error messages
  `,
  async run({ log }) {
    log.warning(dedent`
      This command is only necessary for the circumstance where you need to recover a consistent
      state when problems arise. If you need to run this command often, please let us know by
      filling out this form: https://ela.st/yarn-kbn-clean.

      Please note it might not solve problems with node_modules. To solve problems around node_modules
      you might need to run 'yarn kbn reset'.
    `);

    await cleanPaths(log, [
      ...(await findPluginCleanPaths(log)),
      ...collectBazelPaths(),
      Path.resolve(REPO_ROOT, '.moon', 'cache'),
      Path.resolve(REPO_ROOT, '.es', 'cache'),
    ]);
  },
};
