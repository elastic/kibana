import del from 'del';
import chalk from 'chalk';
import { relative } from 'path';
import ora from 'ora';

import { isDirectory } from '../utils/fs';
import { ProjectGraph, ProjectMap } from '../utils/projects';
import { CommandConfig } from './';

export const name = 'clean';
export const description =
  'Remove the node_modules and target directories from all projects.';

export async function run(
  projects: ProjectMap,
  projectGraph: ProjectGraph,
  { rootPath }: CommandConfig
) {
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
    console.log(chalk.bold.green('\n\nNo directories to delete'));
  } else {
    console.log(chalk.bold.red('\n\nDeleting directories:\n'));

    for (const dir of directoriesToDelete) {
      const deleting = del(dir, { force: true });
      // Remove once https://github.com/DefinitelyTyped/DefinitelyTyped/pull/23699 is merged.
      (ora as any).promise(deleting, relative(rootPath, dir));
      await deleting;
    }
  }
}
