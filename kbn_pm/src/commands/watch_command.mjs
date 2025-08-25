/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { watchPackage } from '../lib/webpack.mjs';
import { run } from '../lib/spawn.mjs';

/** @type {import('../lib/command').Command} */
export const command = {
  name: 'watch',
  description: 'Runs a build in the webpack-built packages and keeps watching them for changes',
  flagsHelp: `
    --allow-root         Required supplementary flag if you're running this command as root.
    --offline            Run the installation process without consulting online resources. This is useful and
                          sometimes necessary for using bootstrap on an airplane for instance. The local caches
                          will be used exclusively, including a yarn-registry local mirror which is created and
                          maintained by successful online bootstrap executions.
  `,
  reportTimings: {
    group: 'scripts/kbn watch',
    id: 'total',
  },

  async run({ args }) {
    const quiet = args.getBooleanValue('quiet') ?? false;

    // Since the watch doesn't guarantee the right ordering, we'd run a build first:
    await run('yarn', ['kbn', 'build-shared'], { pipe: !quiet });

    // Watch packages
    const kbnUiSharedDepsNpmPath = 'src/platform/packages/private/kbn-ui-shared-deps-npm';
    const kbnUiSharedDepsSrcPath = 'src/platform/packages/private/kbn-ui-shared-deps-src';
    const kbnMonacoPath = 'src/platform/packages/shared/kbn-monaco';

    const watchesFinished = [];
    for (const packageName of [kbnUiSharedDepsSrcPath, kbnMonacoPath, kbnUiSharedDepsNpmPath]) {
      watchesFinished.push(
        watchPackage(packageName, {
          quiet,
        })
      );
    }
    await Promise.all(watchesFinished);
  },
};
