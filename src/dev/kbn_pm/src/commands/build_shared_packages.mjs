/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '../lib/spawn.mjs';

/** @type {import('../lib/command').Command} */
export const command = {
  name: 'build-shared',
  intro: 'Builds shared packages with webpack',
  description: 'Builds shared packages with webpack',
  reportTimings: {
    group: 'scripts/kbn build-shared',
    id: 'total',
  },
  flagsHelp: `
    --no-cache           Evict cache when rebuilding
    --dist               Build the distributable version of the packages
    --allow-root         Required supplementary flag if you're running this command as root.
    --quiet              Prevent logging more than basic success/error messages
  `,
  async run({ log, args }) {
    const dist = args.getBooleanValue('dist') ?? false;
    const quiet = args.getBooleanValue('quiet') ?? false;
    const cache = args.getBooleanValue('cache') ?? true;

    log.info('building shared packages with webpack');
    await run(
      'moon',
      [':build-webpack'].concat(!cache ? ['-u'] : []).concat(dist ? ['--', '--dist'] : []),
      {
        pipe: !quiet,
        env: {
          ...process.env,
          ...(!cache ? { MOON_CACHE: 'off' } : {}),
        },
      }
    );

    log.success('shared packages built');
  },
};
