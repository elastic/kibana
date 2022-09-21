/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Bazel from '../../lib/bazel.mjs';
import { createCliError } from '../../lib/cli_error.mjs';
import { packageDiscovery } from '../../lib/package_discovery.mjs';
import { generatePackageJsons } from '../../config_generation/generate_package_json.mjs';

/** @type {import('../../lib/command').Command} */
export const command = {
  name: 'watch',
  description: 'Runs a build in the Bazel built packages and keeps watching them for changes',
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

  async run({ args, log }) {
    let ManifestWatcher;
    try {
      // ensure that package.json files are up-to-date
      await generatePackageJsons(await packageDiscovery());

      // get the watcher which will keep the packageJson files up-to-date going forward
      ({ ManifestWatcher } = await import('./manifest_watcher.mjs'));
    } catch (error) {
      throw createCliError(
        `You must run "bootstrap" before running "watch", unable to load necessary dependencies:\n${error.message}`
      );
    }

    await Promise.all([
      new ManifestWatcher(log).run(),
      Bazel.watch(log, {
        offline: args.getBooleanValue('offline') ?? true,
      }),
    ]);
  },
};
