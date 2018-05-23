import chalk from 'chalk';

import { log } from '../utils/log';
import { parallelizeBatches } from '../utils/parallelize';
import { topologicallyBatchProjects } from '../utils/projects';
import { ICommand } from './';

export const RunCommand: ICommand = {
  description:
    'Run script defined in package.json in each package that contains that script.',
  name: 'run',

  async run(projects, projectGraph, { extraArgs }) {
    const batchedProjects = topologicallyBatchProjects(projects, projectGraph);

    if (extraArgs.length === 0) {
      log.write(chalk.red.bold('\nNo script specified'));
      process.exit(1);
    }

    const scriptName = extraArgs[0];
    const scriptArgs = extraArgs.slice(1);

    log.write(
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
  },
};
