/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
