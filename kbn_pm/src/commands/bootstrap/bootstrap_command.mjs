/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '../../lib/spawn.mjs';
import * as Bazel from '../../lib/bazel.mjs';
import { haveNodeModulesBeenManuallyDeleted, removeYarnIntegrityFileIfExists } from './yarn.mjs';
import { setupRemoteCache } from './setup_remote_cache.mjs';
import { regenerateSyntheticPackageMap } from './regenerate_synthetic_package_map.mjs';
import { sortPackageJson } from './sort_package_json.mjs';
import { REPO_ROOT } from '../../lib/paths.mjs';
import { pluginDiscovery } from './plugins.mjs';
import { regenerateBaseTsconfig } from './regenerate_base_tsconfig.mjs';

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

    await Bazel.tryRemovingBazeliskFromYarnGlobal(log);

    // Install bazel machinery tools if needed
    await Bazel.ensureInstalled(log);

    // Setup remote cache settings in .bazelrc.cache if needed
    await setupRemoteCache(log);

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

    const plugins = await time('plugin discovery', async () => {
      return await pluginDiscovery();
    });

    // generate the synthetic package map which powers several other features, needed
    // as an input to the package build
    await time('regenerate synthetic package map', async () => {
      await regenerateSyntheticPackageMap(plugins);
    });

    await time('build packages', async () => {
      await Bazel.buildPackages(log, { offline, quiet });
    });
    await time('sort package json', async () => {
      await sortPackageJson();
    });
    await time('regenerate tsconfig.base.json', async () => {
      const { discoverBazelPackages } = await import('@kbn/bazel-packages');
      await regenerateBaseTsconfig(await discoverBazelPackages(REPO_ROOT), plugins);
    });

    if (validate) {
      // now that packages are built we can import `@kbn/yarn-lock-validator`
      const { readYarnLock, validateDependencies } = await import('@kbn/yarn-lock-validator');
      const yarnLock = await time('read yarn.lock', async () => {
        return await readYarnLock();
      });
      await time('validate dependencies', async () => {
        await validateDependencies(log, yarnLock);
      });
    }

    if (vscodeConfig) {
      await time('update vscode config', async () => {
        // Update vscode settings
        await run('node', ['scripts/update_vscode_config']);

        log.success('vscode config updated');
      });
    }
  },
};
