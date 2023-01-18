/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '../../lib/spawn.mjs';
import * as Bazel from '../../lib/bazel.mjs';
import External from '../../lib/external_packages.js';

import { haveNodeModulesBeenManuallyDeleted, removeYarnIntegrityFileIfExists } from './yarn.mjs';
import { setupRemoteCache } from './setup_remote_cache.mjs';
import { sortPackageJson } from './sort_package_json.mjs';
import { regeneratePackageMap } from './regenerate_package_map.mjs';
import { regenerateTsconfigPaths } from './regenerate_tsconfig_paths.mjs';
import { regenerateBaseTsconfig } from './regenerate_base_tsconfig.mjs';
import { discovery } from './discovery.mjs';
import { updatePackageJson } from './update_package_json.mjs';

/** @type {import('../../lib/command').Command} */
export const command = {
  name: 'bootstrap',
  intro: 'Bootstrap the Kibana repository, installs all dependencies and builds all packages',
  description: `
    This command should be run every time you checkout a new revision, or can be used to build all packages
    once after making a change locally. Package builds are cached remotely so when you don't have local
    changes build artifacts will be downloaded from the remote cache.
  `,
  flagsHelp: `
    --force-install      Use this flag to force bootstrap to install yarn dependencies. By default the
                          command will attempt to only run yarn installs when necessary, but if you manually
                          delete the node modules directory or have an issue in your node_modules directory
                          you might need to force the install manually.
    --offline            Run the installation process without consulting online resources. This is useful and
                          sometimes necessary for using bootstrap on an airplane for instance. The local caches
                          will be used exclusively, including a yarn-registry local mirror which is created and
                          maintained by successful online bootstrap executions.
    --no-validate        By default bootstrap validates the yarn.lock file to check for a handfull of
                          conditions. If you run into issues with this process locally you can disable it by
                          passing this flag.
    --no-vscode          By default bootstrap updates the .vscode directory to include commonly useful vscode
                          settings for local development. Disable this process either pass this flag or set
                          the KBN_BOOTSTRAP_NO_VSCODE=true environment variable.
    --quiet              Prevent logging more than basic success/error messages
  `,
  reportTimings: {
    group: 'scripts/kbn bootstrap',
    id: 'total',
  },
  async run({ args, log, time }) {
    const offline = args.getBooleanValue('offline') ?? false;
    const validate = args.getBooleanValue('validate') ?? true;
    const quiet = args.getBooleanValue('quiet') ?? false;
    const vscodeConfig =
      args.getBooleanValue('vscode') ?? (process.env.KBN_BOOTSTRAP_NO_VSCODE ? false : true);

    // Force install is set in case a flag is passed into yarn kbn bootstrap or
    // our custom logic have determined there is a chance node_modules have been manually deleted and as such bazel
    // tracking mechanism is no longer valid
    const forceInstall =
      args.getBooleanValue('force-install') ?? (await haveNodeModulesBeenManuallyDeleted());

    const [{ packages, plugins, tsConfigsPaths }] = await Promise.all([
      // discover the location of packages, plugins, etc
      await time('discovery', discovery),

      (async () => {
        await Bazel.tryRemovingBazeliskFromYarnGlobal(log);

        // Install bazel machinery tools if needed
        await Bazel.ensureInstalled(log);

        // Setup remote cache settings in .bazelrc.cache if needed
        await setupRemoteCache(log);
      })(),
    ]);

    // generate the package map and package.json file, if necessary
    await Promise.all([
      time('regenerate package map', async () => {
        await regeneratePackageMap(packages, plugins, log);
      }),
      time('regenerate tsconfig map', async () => {
        await regenerateTsconfigPaths(tsConfigsPaths, log);
      }),
      time('update package json', async () => {
        await updatePackageJson(packages, log);
      }),
    ]);

    // Bootstrap process for Bazel packages
    // Bazel is now managing dependencies so yarn install
    // will happen as part of this
    //
    // NOTE: Bazel projects will be introduced incrementally
    // And should begin from the ones with none dependencies forward.
    // That way non bazel projects could depend on bazel projects but not the other way around
    // That is only intended during the migration process while non Bazel projects are not removed at all.
    if (forceInstall) {
      await time('force install dependencies', async () => {
        await removeYarnIntegrityFileIfExists();
        await Bazel.expungeCache(log, { quiet });
        await Bazel.installYarnDeps(log, { offline, quiet });
      });
    }

    await time('pre-build webpack bundles for packages', async () => {
      await Bazel.buildWebpackBundles(log, { offline, quiet });
    });

    await Promise.all([
      time('regenerate tsconfig.base.json', async () => {
        await regenerateBaseTsconfig();
      }),
      time('sort package json', async () => {
        await sortPackageJson(log);
      }),
      validate
        ? time('validate dependencies', async () => {
            // now that deps are installed we can import `@kbn/yarn-lock-validator`
            const { readYarnLock, validateDependencies } = External['@kbn/yarn-lock-validator']();
            await validateDependencies(log, await readYarnLock());
          })
        : undefined,
      vscodeConfig
        ? time('update vscode config', async () => {
            // Update vscode settings
            await run('node', ['scripts/update_vscode_config']);

            log.success('vscode config updated');
          })
        : undefined,
    ]);
  },
};
