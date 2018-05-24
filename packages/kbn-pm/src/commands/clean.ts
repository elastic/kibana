import chalk from 'chalk';
import del from 'del';
import ora from 'ora';
import { relative } from 'path';

import { isDirectory } from '../utils/fs';
import { log } from '../utils/log';
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
      log.write(chalk.bold.green('\n\nNo directories to delete'));
    } else {
      log.write(chalk.bold.red('\n\nDeleting directories:\n'));

      for (const dir of directoriesToDelete) {
        const deleting = del(dir, { force: true });
        ora.promise(deleting, relative(rootPath, dir));
        await deleting;
      }
    }
  },
};
