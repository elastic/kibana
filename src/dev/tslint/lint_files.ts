import { run } from 'tslint/lib/runner';

import { ToolingLog } from '@kbn/dev-utils';
import { File } from '../file';
import { createFailError } from '../run';
import { getTsProjectForAbsolutePath, Project } from '../typescript';

function groupFilesByProject(files: File[]) {
  const filesByProject: Map<Project, File[]> = new Map();

  files.forEach(file => {
    const project = getTsProjectForAbsolutePath(file.getAbsolutePath());
    const filesForProject = filesByProject.get(project);

    if (!filesForProject) {
      filesByProject.set(project, [file]);
    } else {
      filesForProject.push(file);
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
export async function lintFiles(log: ToolingLog, files: File[]) {
  for (const [project, filesInProject] of groupFilesByProject(files)) {
    const exitCode = await run(
      {
        exclude: [],
        files: filesInProject.map(f => f.getAbsolutePath()),
        fix: false,
        format: 'stylish',
        project: project.tsConfigPath,
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
        project.name,
        filesInProject.length
      );
    }
  }
}
