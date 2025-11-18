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
  name: 'watch',
  description: 'Runs a build in the webpack-built packages and keeps watching them for changes',
  flagsHelp: `
    --allow-root         Required supplementary flag if you're running this command as root.
  `,
  reportTimings: {
    group: 'scripts/kbn watch',
    id: 'total',
  },

  async run({ args }) {
    const quiet = args.getBooleanValue('quiet') ?? false;

    await run('moon', [':watch-webpack'], { pipe: !quiet });
  },
};
