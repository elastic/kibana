import chalk from 'chalk';
import del from 'del';
import ora from 'ora';
import { relative } from 'path';

import { isDirectory } from '../utils/fs';
import { ICommand } from './';

export const CleanCommand: ICommand = {
  description:
    'Remove the node_modules and target directories from all projects.',
  name: 'clean',

  async run(projects, projectGraph, { rootPath }) {
    const directoriesToDelete = [];
    for (const project of projects.values()) {
      if (await isDirectory(project.nodeModulesLocation)) {
        directoriesToDelete.push(project.nodeModulesLocation);
      }

      if (await isDirectory(project.targetLocation)) {
        directoriesToDelete.push(project.targetLocation);
      }
    }

    if (directoriesToDelete.length === 0) {
      /* tslint:disable-next-line no-console */
      console.log(chalk.bold.green('\n\nNo directories to delete'));
    } else {
      /* tslint:disable-next-line no-console */
      console.log(chalk.bold.red('\n\nDeleting directories:\n'));

      for (const dir of directoriesToDelete) {
        const deleting = del(dir, { force: true });
        ora.promise(deleting, relative(rootPath, dir));
        await deleting;
      }
    }
  },
};
