/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { linkProjectExecutables } from '../utils/link_project_executables';
import { log } from '../utils/log';
import { parallelizeBatches } from '../utils/parallelize';
import { topologicallyBatchProjects } from '../utils/projects';
import { Project } from '../utils/project';
import { ICommand } from './';
import { getAllChecksums } from '../utils/project_checksums';
import { BootstrapCacheFile } from '../utils/bootstrap_cache_file';

export const BootstrapCommand: ICommand = {
  description: 'Install dependencies and crosslink projects',
  name: 'bootstrap',

  async run(projects, projectGraph, { options, kbn }) {
    const batchedProjectsByWorkspace = topologicallyBatchProjects(projects, projectGraph, {
      batchByWorkspace: true,
    });
    const batchedProjects = topologicallyBatchProjects(projects, projectGraph);

    const extraArgs = [
      ...(options['frozen-lockfile'] === true ? ['--frozen-lockfile'] : []),
      ...(options['prefer-offline'] === true ? ['--prefer-offline'] : []),
    ];

    for (const batch of batchedProjectsByWorkspace) {
      for (const project of batch) {
        if (project.isWorkspaceProject) {
          log.verbose(`Skipping workspace project: ${project.name}`);
          continue;
        }

        if (project.hasDependencies()) {
          await project.installDependencies({ extraArgs });
        }
      }
    }

    await linkProjectExecutables(projects, projectGraph);

    /**
     * At the end of the bootstrapping process we call all `kbn:bootstrap` scripts
     * in the list of projects. We do this because some projects need to be
     * transpiled before they can be used. Ideally we shouldn't do this unless we
     * have to, as it will slow down the bootstrapping process.
     */

    const checksums = await getAllChecksums(kbn, log);
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
