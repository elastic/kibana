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

import { CliError } from '../utils/errors';
import { log } from '../utils/log';
import { parallelizeBatches } from '../utils/parallelize';
import { topologicallyBatchProjects } from '../utils/projects';
import { ICommand } from './';

export const RunCommand: ICommand = {
  description: 'Run script defined in package.json in each package that contains that script.',
  name: 'run',

  async run(projects, projectGraph, { extraArgs }) {
    const batchedProjects = topologicallyBatchProjects(projects, projectGraph);

    if (extraArgs.length === 0) {
      throw new CliError('No script specified');
    }

    const scriptName = extraArgs[0];
    const scriptArgs = extraArgs.slice(1);

    await parallelizeBatches(batchedProjects, async (project) => {
      if (project.hasScript(scriptName)) {
        log.info(`[${project.name}] running "${scriptName}" script`);
        await project.runScriptStreaming(scriptName, {
          args: scriptArgs,
        });
        log.success(`[${project.name}] complete`);
      }
    });
  },
};
