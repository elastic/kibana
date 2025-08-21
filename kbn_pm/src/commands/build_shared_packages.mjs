/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildPackage } from '../lib/webpack.mjs';

/** @type {import("../lib/command").Command} */
export const command = {
  name: 'build-shared',
  intro: 'Builds shared packages with webpack',
  description: 'Builds shared packages with webpack',
  reportTimings: {
    group: 'scripts/kbn build-shared',
    id: 'total',
  },
  flagsHelp: `
    --dist               Build the distributable version of the packages
    --allow-root         Required supplementary flag if you're running this command as root.
    --quiet              Prevent logging more than basic success/error messages
  `,
  async run({ log, args }) {
    const dist = args.getBooleanValue('dist') ?? false;
    const quiet = args.getBooleanValue('quiet') ?? false;

    log.info('building shared packages with webpack');

    // These are currently the shared packages that need building prior to running Kibana
    // and are not built as part of the Kibana build process.
    const kbnUiSharedDepsNpmPath = 'src/platform/packages/private/kbn-ui-shared-deps-npm';
    const kbnUiSharedDepsSrcPath = 'src/platform/packages/private/kbn-ui-shared-deps-src';
    const kbnMonacoPath = 'src/platform/packages/shared/kbn-monaco';

    // Build with some parallelization;
    // keeping in mind that kbn-ui-shared-deps-src depends on kbn-ui-shared-deps-npm
    await Promise.all([
      chain([
        () => buildPackage(kbnUiSharedDepsNpmPath, { quiet, dist, log }),
        () => buildPackage(kbnUiSharedDepsSrcPath, { quiet, dist, log }),
      ]),
      buildPackage(kbnMonacoPath, { quiet, dist, log }),
    ]);

    log.success('shared packages built');
  },
};

/**
 * Runs promises sequentially
 * @param {Array<() => Promise<void>>} fns
 * @returns {Promise<void>}
 */
function chain(fns) {
  return fns.reduce((p, fn) => p.then(fn), Promise.resolve());
}
