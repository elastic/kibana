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
import { topologicallyBatchProjects } from '../utils/projects';
import { ICommand } from './';

export const BootstrapCommand: ICommand = {
  description: 'Install dependencies and crosslink projects',
  name: 'bootstrap',

  async run(projects, projectGraph, { options }) {
    const batchedProjects = topologicallyBatchProjects(projects, projectGraph);

    const frozenLockfile = options['frozen-lockfile'] === true;
    const extraArgs = frozenLockfile ? ['--frozen-lockfile'] : [];

    log.write(chalk.bold('\nRunning installs in topological order:'));

    for (const batch of batchedProjects) {
      for (const project of batch) {
        if (project.hasDependencies()) {
          await project.installDependencies({ extraArgs });
        }
      }
    }

    log.write(chalk.bold('\nInstalls completed, linking package executables:\n'));
    await linkProjectExecutables(projects, projectGraph);

    log.write(chalk.green.bold('\nBootstrapping completed!\n'));
  },
};
