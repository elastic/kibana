/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { watchPackage } from '../lib/webpack.mjs';

/** @type {import('../lib/command').Command} */
export const command = {
  name: 'watch',
  description: 'Runs a build in the webpack-built packages and keeps watching them for changes',
  flagsHelp: `
    --offline            Run the installation process without consulting online resources. This is useful and
                          sometimes necessary for using bootstrap on an airplane for instance. The local caches
                          will be used exclusively, including a yarn-registry local mirror which is created and
                          maintained by successful online bootstrap executions.
  `,
  reportTimings: {
    group: 'scripts/kbn watch',
    id: 'total',
  },

  async run() {
    const packageNames = ['kbn-ui-shared-deps-npm', 'kbn-ui-shared-deps-src', 'kbn-monaco'];
    const watchesFinished = [];
    for (const packageName of packageNames) {
      watchesFinished.push(
        watchPackage(packageName, {
          quiet: false,
        })
      );
    }
    await Promise.all(watchesFinished);
  },
};
