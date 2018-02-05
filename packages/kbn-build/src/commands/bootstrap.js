import chalk from 'chalk';

import { topologicallyBatchProjects } from '../utils/projects';

export const name = 'bootstrap';
export const description = 'Install dependencies and crosslink projects';

export async function run(projects, projectGraph, { options }) {
  const batchedProjects = topologicallyBatchProjects(projects, projectGraph);

  const frozenLockfile = options['frozen-lockfile'] === true;
  const extraArgs = frozenLockfile ? ['--frozen-lockfile'] : [];

  console.log(chalk.bold('\nRunning installs in topological order'));

  for (const batch of batchedProjects) {
    for (const project of batch) {
      if (project.hasDependencies()) {
        await project.installDependencies({ extraArgs });
      }
    }
  }
}
