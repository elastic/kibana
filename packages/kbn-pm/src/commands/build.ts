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
import { log } from '../utils/log';
import { parallelizeBatches } from '../utils/parallelize';
import { ProjectMap, topologicallyBatchProjects } from '../utils/projects';
import { ICommand } from './';

/**
 * Name of the script in the package/project package.json file to run during `kbn build`.
 */
const buildScriptName = 'kbn:build';

/**
 * Name of the Kibana project.
 */
const kibanaProjectName = 'kibana';

/**
 * Name of the this project.
 */
const pkgProjectName = '@kbn/pm';

/**
 * Command that traverses through list of available projects/packages that have `kbn:build` script in their
 * package.json files, groups them into topology aware batches and then processes theses batches one by one
 * running `kbn:build` scripts in parallel within the same batch.
 */
export const BuildCommand: ICommand = {
  description: 'Runs `kbn:build` script for every project.',
  name: 'build',

  async run(projects, projectGraph) {
    const projectsToBuild: ProjectMap = new Map();
    for (const project of projects.values()) {
      // We can't build project that doesn't have `kbn:build` script.
      if (project.hasScript(buildScriptName)) {
        projectsToBuild.set(project.name, project);
      }
    }

    if (projectsToBuild.size === 0) {
      log.write(
        chalk.red(
          `\nThere are no projects to build found. Make sure that projects define 'kbn:build' script in 'package.json'.\n`
        )
      );
      return;
    }

    const projectNames = Array.from(projectsToBuild.keys());
    log.write(
      chalk.bold(
        chalk.green(`Running ${buildScriptName} scripts for [${projectNames.join(', ')}].`)
      )
    );

    // Kibana should always be run the last, while kbn pm should be first
    // so we don't rely on automatic topological batching
    const shouldBuildKibanaProject = projectsToBuild.delete(kibanaProjectName);
    const shouldBuildKbnProject = projectsToBuild.delete(pkgProjectName);

    const batchedProjects = topologicallyBatchProjects(projectsToBuild, projectGraph);

    if (shouldBuildKibanaProject) {
      batchedProjects.push([projects.get(kibanaProjectName)!]);
    }

    if (shouldBuildKbnProject) {
      batchedProjects.unshift([projects.get(pkgProjectName)!]);
    }

    await parallelizeBatches(batchedProjects, async pkg => {
      await pkg.runScript(buildScriptName);

      log.write(chalk.bold(`[${chalk.green(pkg.name)}] Build completed.`));
    });
  },
};
