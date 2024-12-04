/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '../../lib/spawn.mjs';
import External from '../../lib/external_packages.js';
import { buildPackages } from '../../lib/webpack.mjs';

import {
  haveNodeModulesBeenManuallyDeleted,
  removeYarnIntegrityFileIfExists,
  yarnInstallDeps,
} from './yarn.mjs';
import { sortPackageJson } from './sort_package_json.mjs';
import { regeneratePackageMap } from './regenerate_package_map.mjs';
import { regenerateTsconfigPaths } from './regenerate_tsconfig_paths.mjs';
import { regenerateBaseTsconfig } from './regenerate_base_tsconfig.mjs';
import { discovery } from './discovery.mjs';
import { updatePackageJson } from './update_package_json.mjs';

const tryImportLockValidator = () => {
  try {
    return External['@kbn/yarn-lock-validator']();
  } catch (_err) {
    return null;
  }
};

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
    --disable-nx-cache   Prevents NX from using any cached build artifacts. This is useful when you want to
                          ensure that all packages are built from scratch.
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
    const disableNXCache = args.getBooleanValue('disable-nx-cache') ?? false;
    const vscodeConfig =
      args.getBooleanValue('vscode') ?? (process.env.KBN_BOOTSTRAP_NO_VSCODE ? false : true);

    // Force install is set in case a flag is passed into yarn kbn bootstrap, or node_modules have been removed
    let forceReinstall =
      args.getBooleanValue('force-install') ?? (await haveNodeModulesBeenManuallyDeleted());
    if (!forceReinstall) {
      const lockValidatorModule = tryImportLockValidator();
      if (!lockValidatorModule) {
        // linking is not done, we should install
        forceReinstall = true;
      } else {
        const { findProductionDependencies, readYarnLock } = lockValidatorModule;
        const yarnLock = await readYarnLock();
        const allListedPackagesResolvedInYarnLock = !!findProductionDependencies(
          log,
          yarnLock,
          false
        );
        forceReinstall = !allListedPackagesResolvedInYarnLock;
      }
    }

    const { packageManifestPaths, tsConfigRepoRels } = await time('discovery', discovery);

    // generate the package map and package.json file, if necessary
    const [packages] = await Promise.all([
      time('regenerate package map', async () => {
        return await regeneratePackageMap(log, packageManifestPaths);
      }),
      time('regenerate tsconfig map', async () => {
        await regenerateTsconfigPaths(tsConfigRepoRels, log);
      }),
    ]);

    await Promise.all([
      time('update package json', async () => {
        await updatePackageJson(packages, log);
      }),
      time('regenerate tsconfig.base.json', async () => {
        await regenerateBaseTsconfig(packages, log);
      }),
    ]);

    if (forceReinstall) {
      await time('force install dependencies', async () => {
        await removeYarnIntegrityFileIfExists();
        await yarnInstallDeps(log, { offline, quiet });
      });
    }

    await time('pre-build webpack bundles for packages', async () => {
      await buildPackages(['@kbn/monaco', '@kbn/ui-shared-deps-src', '@kbn/ui-shared-deps-npm'], {
        log,
        disableNXCache,
        quiet,
      });
      log.success('shared bundles built');
    });

    await time('sort package json', async () => {
      await sortPackageJson(log);
    });
    if (validate) {
      await time('validate dependencies', async () => {
        // now that deps are installed we can import `@kbn/yarn-lock-validator`
        const lockValidatorModule = tryImportLockValidator();
        if (!lockValidatorModule) {
          log.warning(
            'Yarn lock validator is not installed, skipping dependency validation. ' +
              'This is likely due to a failure in the bootstrap process.'
          );
          return;
        }
        const { readYarnLock, validateDependencies } = lockValidatorModule;
        await validateDependencies(log, await readYarnLock());
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
