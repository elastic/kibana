import chalk from 'chalk';

import { topologicallyBatchProjects } from '../utils/projects';
import { linkProjectExecutables } from '../utils/link_project_executables';
import { parallelizeBatches } from '../utils/parallelize';
import { Command } from './';

export const BootstrapCommand: Command = {
  name: 'bootstrap',
  description: 'Install dependencies and crosslink projects',

  async run(projects, projectGraph, { options }) {
    const batchedProjects = topologicallyBatchProjects(projects, projectGraph);

    const frozenLockfile = options['frozen-lockfile'] === true;
    const extraArgs = frozenLockfile ? ['--frozen-lockfile'] : [];

    console.log(chalk.bold('\nRunning installs in topological order:'));

    for (const batch of batchedProjects) {
      for (const project of batch) {
        if (project.hasDependencies()) {
          await project.installDependencies({ extraArgs });
        }
      }
    }

    console.log(
      chalk.bold('\nInstalls completed, linking package executables:\n')
    );
    await linkProjectExecutables(projects, projectGraph);

    /**
     * At the end of the bootstrapping process we call all `kbn:bootstrap` scripts
     * in the list of projects. We do this because some projects need to be
     * transpiled before they can be used. Ideally we shouldn't do this unless we
     * have to, as it will slow down the bootstrapping process.
     */
    console.log(
      chalk.bold(
        '\nLinking executables completed, running `kbn:bootstrap` scripts\n'
      )
    );
    await parallelizeBatches(batchedProjects, async pkg => {
      if (pkg.hasScript('kbn:bootstrap')) {
        await pkg.runScriptStreaming('kbn:bootstrap');
      }
    });

    console.log(chalk.green.bold('\nBootstrapping completed!\n'));
  },
};
