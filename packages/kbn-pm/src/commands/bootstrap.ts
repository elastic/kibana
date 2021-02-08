/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sep } from 'path';
import { linkProjectExecutables } from '../utils/link_project_executables';
import { log } from '../utils/log';
import { parallelizeBatches } from '../utils/parallelize';
import { getNonBazelProjectsOnly, topologicallyBatchProjects } from '../utils/projects';
import { Project } from '../utils/project';
import { ICommand } from './';
import { getAllChecksums } from '../utils/project_checksums';
import { BootstrapCacheFile } from '../utils/bootstrap_cache_file';
import { readYarnLock } from '../utils/yarn_lock';
import { validateDependencies } from '../utils/validate_dependencies';
import { installBazelTools, runBazel } from '../utils/bazel';

export const BootstrapCommand: ICommand = {
  description: 'Install dependencies and crosslink projects',
  name: 'bootstrap',

  async run(projects, projectGraph, { options, kbn, rootPath }) {
    const nonBazelProjectsOnly = await getNonBazelProjectsOnly(projects);
    const batchedNonBazelProjects = topologicallyBatchProjects(nonBazelProjectsOnly, projectGraph);
    const kibanaProjectPath = projects.get('kibana')?.path;

    // Install bazel machinery tools if needed
    await installBazelTools(rootPath);

    // Bootstrap process for Bazel packages
    // Bazel is now managing dependencies so yarn install
    // will happen as part of this
    //
    // NOTE: Bazel projects will be introduced incrementally
    // And should begin from the ones with none dependencies forward.
    // That way non bazel projects could depend on bazel projects but not the other way around
    // That is only intended during the migration process while non Bazel projects are not removed at all.
    await runBazel(['build', '//packages:build']);

    // Build configures ts project refs with Bazel
    await runBazel(['build', '//:build_ts_refs']);

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

    const yarnLock = await readYarnLock(kbn);

    if (options.validate) {
      await validateDependencies(kbn, yarnLock);
    }

    // Assure all kbn projects with bin defined scripts
    // copy those scripts into the top level node_modules folder
    //
    // NOTE: We don't probably need this anymore, is actually not being used
    await linkProjectExecutables(projects, projectGraph);

    // Bootstrap process for non Bazel packages
    /**
     * At the end of the bootstrapping process we call all `kbn:bootstrap` scripts
     * in the list of non Bazel projects. We do this because some projects need to be
     * transpiled before they can be used. Ideally we shouldn't do this unless we
     * have to, as it will slow down the bootstrapping process.
     */

    const checksums = await getAllChecksums(kbn, log, yarnLock);
    const caches = new Map<Project, { file: BootstrapCacheFile; valid: boolean }>();
    let cachedProjectCount = 0;

    for (const project of nonBazelProjectsOnly.values()) {
      if (project.hasScript('kbn:bootstrap') && !project.isBazelPackage()) {
        const file = new BootstrapCacheFile(kbn, project, checksums);
        const valid = options.cache && file.isValid();

        if (valid) {
          log.debug(`[${project.name}] cache up to date`);
          cachedProjectCount += 1;
        }

        caches.set(project, { file, valid });
      }
    }

    if (cachedProjectCount > 0) {
      log.success(`${cachedProjectCount} bootstrap builds are cached`);
    }

    await parallelizeBatches(batchedNonBazelProjects, async (project) => {
      const cache = caches.get(project);
      if (cache && !cache.valid) {
        log.info(`[${project.name}] running [kbn:bootstrap] script`);
        cache.file.delete();
        await project.runScriptStreaming('kbn:bootstrap');
        cache.file.write();
        log.success(`[${project.name}] bootstrap complete`);
      }
    });
  },
};
