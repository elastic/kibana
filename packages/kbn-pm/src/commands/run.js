import chalk from 'chalk';

import { topologicallyBatchProjects } from '../utils/projects';
import { parallelizeBatches } from '../utils/parallelize';

export const name = 'run';
export const description =
  'Run script defined in package.json in each package that contains that script.';

export async function run(projects, projectGraph, { extraArgs }) {
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

  await parallelizeBatches(batchedProjects, pkg => {
    if (pkg.hasScript(scriptName)) {
      return pkg.runScriptStreaming(scriptName, scriptArgs);
    }
  });
}
