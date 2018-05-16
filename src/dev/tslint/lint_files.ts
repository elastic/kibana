import { CLIEngine } from 'eslint';
import { run } from 'tslint/lib/runner';

import { IToolingLog } from '@kbn/dev-utils';
import { REPO_ROOT } from '../constants';
import { File } from '../file';
import { createFailError } from '../run';
import { getTsProjects, Project } from './projects';

function groupFilesByProject(files: File[]) {
  const projects = getTsProjects();
  const filesByProject: Map<Project, File[]> = new Map();

  files.forEach(file => {
    const project = projects.find(p => p.isFileSelected(file));

    if (!project) {
      throw createFailError(
        `[tslint] ${file.getRelativePath()} is not a part of any project`,
        1
      );
    }

    if (filesByProject.has(project)) {
      filesByProject.get(project)!.push(file);
    } else {
      filesByProject.set(project, [file]);
    }
  });

  return filesByProject;
}

/**
 * Lints a list of files with eslint. eslint reports are written to the log
 * and a FailError is thrown when linting errors occur.
 *
 * @param  {ToolingLog} log
 * @param  {Array<File>} files
 * @return {undefined}
 */
export async function lintFiles(log: IToolingLog, files: File[]) {
  for (const [project, filesInProject] of groupFilesByProject(files)) {
    const exitCode = await run(
      {
        exclude: [],
        files: filesInProject.map(f => f.getAbsolutePath()),
        fix: false,
        format: 'stylish',
        project: project.getTsConfigPath(),
      },
      {
        log(m: string) {
          log.write(m);
        },
        error(m: string) {
          log.error(m);
        },
      }
    );

    if (exitCode > 0) {
      throw createFailError(`[tslint] failure`, 1);
    } else {
      log.success(
        '[tslint/%s] %d files linted successfully',
        project.getName(),
        files.length
      );
    }
  }
}
