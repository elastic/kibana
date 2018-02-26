import chalk from 'chalk';

import {
  ProjectGraph,
  ProjectMap,
  topologicallyBatchProjects,
} from '../utils/projects';
import { parallelizeBatches } from '../utils/parallelize';
import { createCommand, Command } from './command';

export const RunCommand = createCommand(
  {
    name: 'run',
    description:
      'Run script defined in package.json in each package that contains that script.',
  },

  async function(projects, projectGraph, { extraArgs, options }) {
    const batchedProjects = topologicallyBatchProjects(projects, projectGraph);

    if (extraArgs.length === 0) {
      console.log(chalk.red.bold('\nNo script specified'));
      process.exit(1);
    }

    const scriptName = extraArgs[0];
    const scriptArgs = extraArgs.slice(1);

    console.log(
      chalk.bold(
        `\nRunning script [${chalk.green(
          scriptName
        )}] in batched topological order\n`
      )
    );

    await parallelizeBatches(batchedProjects, async pkg => {
      if (pkg.hasScript(scriptName)) {
        await pkg.runScriptStreaming(scriptName, scriptArgs);
      }
    });
  }
);
