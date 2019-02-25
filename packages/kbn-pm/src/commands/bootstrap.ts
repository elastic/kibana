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

import chalk from 'chalk';

import { linkProjectExecutables } from '../utils/link_project_executables';
import { log } from '../utils/log';
import { parallelizeBatches } from '../utils/parallelize';
import { topologicallyBatchProjects } from '../utils/projects';
import { ICommand } from './';

export const BootstrapCommand: ICommand = {
  description: 'Install dependencies and crosslink projects',
  name: 'bootstrap',

  async run(projects, projectGraph, { options }) {
    const batchedProjectsByWorkspace = topologicallyBatchProjects(projects, projectGraph, {
      batchByWorkspace: true,
    });
    const batchedProjects = topologicallyBatchProjects(projects, projectGraph);

    const extraArgs = [
      ...(options['frozen-lockfile'] === true ? ['--frozen-lockfile'] : []),
      ...(options['prefer-offline'] === true ? ['--prefer-offline'] : []),
    ];

    log.write(chalk.bold('\nRunning installs in topological order:'));

    for (const batch of batchedProjectsByWorkspace) {
      for (const project of batch) {
        if (project.isWorkspaceProject) {
          log.write(`Skipping workspace project: ${project.name}`);
          continue;
        }

        if (project.hasDependencies()) {
          await project.installDependencies({ extraArgs });
        }
      }
    }

    log.write(chalk.bold('\nInstalls completed, linking package executables:\n'));
    await linkProjectExecutables(projects, projectGraph);

    /**
     * At the end of the bootstrapping process we call all `kbn:bootstrap` scripts
     * in the list of projects. We do this because some projects need to be
     * transpiled before they can be used. Ideally we shouldn't do this unless we
     * have to, as it will slow down the bootstrapping process.
     */
    log.write(chalk.bold('\nLinking executables completed, running `kbn:bootstrap` scripts\n'));
    await parallelizeBatches(batchedProjects, async pkg => {
      if (pkg.hasScript('kbn:bootstrap')) {
        await pkg.runScriptStreaming('kbn:bootstrap');
      }
    });

    log.write(chalk.green.bold('\nBootstrapping completed!\n'));
  },
};
