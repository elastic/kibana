/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { sep } from 'path';
import { linkProjectExecutables } from '../utils/link_project_executables';
import { log } from '../utils/log';
import { parallelizeBatches } from '../utils/parallelize';
import { topologicallyBatchProjects } from '../utils/projects';
import { Project } from '../utils/project';
import { ICommand } from './';
import { getAllChecksums } from '../utils/project_checksums';
import { BootstrapCacheFile } from '../utils/bootstrap_cache_file';
import { readYarnLock } from '../utils/yarn_lock';
import { validateDependencies } from '../utils/validate_dependencies';
import { installBazelTools } from '../utils/bazel';

export const BootstrapCommand: ICommand = {
  description: 'Install dependencies and crosslink projects',
  name: 'bootstrap',

  async run(projects, projectGraph, { options, kbn, rootPath }) {
    const batchedProjects = topologicallyBatchProjects(projects, projectGraph);
    const kibanaProjectPath = projects.get('kibana')?.path;
    const extraArgs = [
      ...(options['frozen-lockfile'] === true ? ['--frozen-lockfile'] : []),
      ...(options['prefer-offline'] === true ? ['--prefer-offline'] : []),
    ];

    // Install bazel machinery tools if needed
    await installBazelTools(rootPath);

    // Install monorepo npm dependencies
    for (const batch of batchedProjects) {
      for (const project of batch) {
        const isExternalPlugin = project.path.includes(`${kibanaProjectPath}${sep}plugins`);

        if (!project.hasDependencies()) {
          continue;
        }

        if (project.isSinglePackageJsonProject || isExternalPlugin) {
          await project.installDependencies({ extraArgs });
          continue;
        }

        if (!project.isEveryDependencyLocal() && !isExternalPlugin) {
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
    await linkProjectExecutables(projects, projectGraph);

    /**
     * At the end of the bootstrapping process we call all `kbn:bootstrap` scripts
     * in the list of projects. We do this because some projects need to be
     * transpiled before they can be used. Ideally we shouldn't do this unless we
     * have to, as it will slow down the bootstrapping process.
     */

    const checksums = await getAllChecksums(kbn, log, yarnLock);
    const caches = new Map<Project, { file: BootstrapCacheFile; valid: boolean }>();
    let cachedProjectCount = 0;

    for (const project of projects.values()) {
      if (project.hasScript('kbn:bootstrap')) {
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

    await parallelizeBatches(batchedProjects, async (project) => {
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
