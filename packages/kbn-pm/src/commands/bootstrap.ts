/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve, sep } from 'path';
import { CiStatsReporter } from '@kbn/dev-utils/ci_stats_reporter';

import { log } from '../utils/log';
import { spawnStreaming } from '../utils/child_process';
import { linkProjectExecutables } from '../utils/link_project_executables';
import { getNonBazelProjectsOnly, topologicallyBatchProjects } from '../utils/projects';
import { ICommand } from './';
import { readYarnLock } from '../utils/yarn_lock';
import { sortPackageJson } from '../utils/sort_package_json';
import { validateDependencies } from '../utils/validate_dependencies';
import { installBazelTools, removeYarnIntegrityFileIfExists, runBazel } from '../utils/bazel';
import { setupRemoteCache } from '../utils/bazel/setup_remote_cache';

export const BootstrapCommand: ICommand = {
  description: 'Install dependencies and crosslink projects',
  name: 'bootstrap',

  reportTiming: {
    group: 'scripts/kbn bootstrap',
    id: 'total',
  },

  async run(projects, projectGraph, { options, kbn, rootPath }) {
    const nonBazelProjectsOnly = await getNonBazelProjectsOnly(projects);
    const batchedNonBazelProjects = topologicallyBatchProjects(nonBazelProjectsOnly, projectGraph);
    const kibanaProjectPath = projects.get('kibana')?.path || '';
    const runOffline = options?.offline === true;
    const reporter = CiStatsReporter.fromEnv(log);
    const timings = [];

    // Force install is set in case a flag `--force-install` is passed into kbn bootstrap
    const forceInstall = !!options && options['force-install'] === true;

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
      const forceInstallStartTime = Date.now();
      await removeYarnIntegrityFileIfExists(resolve(kibanaProjectPath, 'node_modules'));
      await runBazel(['clean']);
      await runBazel(['run', '@nodejs//:yarn'], runOffline, {
        env: {
          SASS_BINARY_SITE:
            'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-sass',
          RE2_DOWNLOAD_MIRROR:
            'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-re2',
        },
      });
      timings.push({
        id: 'force install dependencies',
        ms: Date.now() - forceInstallStartTime,
      });
    }

    // build packages
    const packageStartTime = Date.now();
    await runBazel(['build', '//packages:build', '--show_result=1'], runOffline);
    timings.push({
      id: 'build packages',
      ms: Date.now() - packageStartTime,
    });

    // Install monorepo npm dependencies outside of the Bazel managed ones
    for (const batch of batchedNonBazelProjects) {
      for (const project of batch) {
        const isExternalPlugin = project.path.includes(`${kibanaProjectPath}${sep}plugins`);

        if (!project.hasDependencies()) {
          continue;
        }

        if (isExternalPlugin) {
          await project.installDependencies();
          continue;
        }

        if (
          !project.isSinglePackageJsonProject &&
          !project.isEveryDependencyLocal() &&
          !isExternalPlugin
        ) {
          throw new Error(
            `[${project.name}] is not eligible to hold non local dependencies. Move the non local dependencies into the top level package.json.`
          );
        }
      }
    }

    await sortPackageJson(kbn);

    const yarnLock = await readYarnLock(kbn);

    if (options.validate) {
      await validateDependencies(kbn, yarnLock);
    }

    // Assure all kbn projects with bin defined scripts
    // copy those scripts into the top level node_modules folder
    //
    // NOTE: We don't probably need this anymore, is actually not being used
    await linkProjectExecutables(projects, projectGraph);

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
