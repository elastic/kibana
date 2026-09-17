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
  intro: 'Builds shared frontend packages with Rspack',
  description: 'Builds shared frontend packages with Rspack',
  reportTimings: {
    group: 'scripts/kbn build-shared',
    id: 'total',
  },
  flagsHelp: `
    --no-cache           Evict cache when rebuilding
    --dist               Build the distributable version of the packages
    --watch              Watch shared package sources for changes
    --allow-root         Required supplementary flag if you're running this command as root.
    --quiet              Prevent logging more than basic success/error messages
  `,
  async run({ log, args }) {
    const dist = args.getBooleanValue('dist') ?? false;
    const quiet = args.getBooleanValue('quiet') ?? false;
    const cache = args.getBooleanValue('cache') ?? true;
    const watch = args.getBooleanValue('watch') ?? false;

    log.info('building shared packages with Rspack');
    const rspackArgs = ['scripts/build_rspack_bundles.js', '--shared-only'];
    if (dist) rspackArgs.push('--dist');
    if (watch) rspackArgs.push('--watch');
    if (!cache) rspackArgs.push('--no-cache');
    if (quiet) rspackArgs.push('--quiet');

    await run('node', rspackArgs, {
      pipe: !quiet,
    });

    log.success('shared packages built');
  },
};
