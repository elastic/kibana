import { IToolingLog } from '@kbn/dev-utils';

import { Minimatch } from 'minimatch';
import { File } from '../file';
import { createFailError } from '../run';
import { getTsProjects } from './projects';

export function pickFilesToLint(log: IToolingLog, files: File[]) {
  const projects = getTsProjects();

  const filesNotInProjects: File[] = [];
  const filesToLint = files.filter(file => {
    if (!file.isTypescript()) {
      return false;
    }

    const project = projects.find(p => p.isFileSelected(file));

    if (!project) {
      filesNotInProjects.push(file);
      log.error(
        `[tslint] ${file.getRelativePath()} is not a part of any TypeScript project.`
      );
      return false;
    }

    return true;
  });

  if (filesNotInProjects.length) {
    throw createFailError(
      `[tslint] Ensure that all files are selected by a tsconfig.json file, and that all tsconfig.json files are litsted in "src/dev/tslint/projects.ts"`,
      1
    );
  }

  return filesToLint;
}
