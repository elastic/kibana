/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import { runBazel } from '@kbn/bazel-runner';

import { log } from '../utils/log';
import { spawnStreaming } from '../utils/child_process';
import { linkProjectExecutables } from '../utils/link_project_executables';
import { ICommand } from '.';
import { readYarnLock } from '../utils/yarn_lock';
import { validateDependencies } from '../utils/validate_dependencies';
import {
  installBazelTools,
  haveNodeModulesBeenManuallyDeleted,
  removeYarnIntegrityFileIfExists,
} from '../utils/bazel';
import { setupRemoteCache } from '../utils/bazel/setup_remote_cache';

export const BootstrapCommand: ICommand = {
  description: 'Install dependencies and crosslink projects',
  name: 'bootstrap',

  reportTiming: {
    group: 'scripts/kbn bootstrap',
    id: 'total',
  },

  async run(projects, projectGraph, { options, kbn, rootPath }) {
    const kibanaProjectPath = projects.get('kibana')?.path || '';
    const offline = options?.offline === true;
    const reporter = CiStatsReporter.fromEnv(log);

    const timings: Array<{ id: string; ms: number }> = [];
    const time = async <T>(id: string, body: () => Promise<T>): Promise<T> => {
      const start = Date.now();
      try {
        return await body();
      } finally {
        timings.push({
          id,
          ms: Date.now() - start,
        });
      }
    };

    // Force install is set in case a flag is passed into yarn kbn bootstrap or
    // our custom logic have determined there is a chance node_modules have been manually deleted and as such bazel
    // tracking mechanism is no longer valid
    const forceInstall =
      (!!options && options['force-install'] === true) ||
      (await haveNodeModulesBeenManuallyDeleted(kibanaProjectPath));

    // Install bazel machinery tools if needed
    await installBazelTools(rootPath);

    // Setup remote cache settings in .bazelrc.cache if needed
    await setupRemoteCache(rootPath);

    // Bootstrap process for Bazel packages
    // Bazel is now managing dependencies so yarn install
    // will happen as part of this
    //
    // NOTE: Bazel projects will be introduced incrementally
    // And should begin from the ones with none dependencies forward.
    // That way non bazel projects could depend on bazel projects but not the other way around
    // That is only intended during the migration process while non Bazel projects are not removed at all.
    //

    if (forceInstall) {
      await time('force install dependencies', async () => {
        await removeYarnIntegrityFileIfExists(Path.resolve(kibanaProjectPath, 'node_modules'));
        await runBazel({
          bazelArgs: ['clean', '--expunge'],
          log,
        });
        await runBazel({
          bazelArgs: ['run', '@nodejs//:yarn'],
          offline,
          log,
          execaOpts: {
            env: {
              SASS_BINARY_SITE:
                'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-sass',
              RE2_DOWNLOAD_MIRROR:
                'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-re2',
            },
          },
        });
      });
    }

    // build packages
    await time('build packages', async () => {
      await runBazel({
        bazelArgs: ['build', '//packages:build', '--show_result=1'],
        log,
        offline,
      });
    });

    const yarnLock = await time('read yarn.lock', async () => await readYarnLock(kbn));

    if (options.validate) {
      await time('validate dependencies', async () => {
        await validateDependencies(kbn, yarnLock);
      });
    }

    // Assure all kbn projects with bin defined scripts
    // copy those scripts into the top level node_modules folder
    //
    // NOTE: We don't probably need this anymore, is actually not being used
    await time('link project executables', async () => {
      await linkProjectExecutables(projects, projectGraph);
    });

    await time('update vscode config', async () => {
      // Update vscode settings
      await spawnStreaming(
        process.execPath,
        ['scripts/update_vscode_config'],
        {
          cwd: kbn.getAbsolute(),
          env: process.env,
        },
        { prefix: '[vscode]', debug: false }
      );
    });

    // send timings
    await reporter.timings({
      upstreamBranch: kbn.kibanaProject.json.branch,
      // prevent loading @kbn/utils by passing null
      kibanaUuid: kbn.getUuid() || null,
      timings: timings.map((t) => ({
        group: 'scripts/kbn bootstrap',
        ...t,
      })),
    });
  },
};
