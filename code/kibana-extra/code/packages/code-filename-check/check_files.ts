/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { basename, relative } from 'path';

import { ToolingLog } from '@kbn/dev-utils';
import chalk from 'chalk';
import minimatch from 'minimatch';

import { IGNORE_DIRECTORY_GLOBS, IGNORE_FILE_GLOBS, KEBAB_CASE_DIRECTORY_GLOBS } from './config';
import { File } from './file';

const NON_SNAKE_CASE_RE = /[A-Z \-]/;
const NON_KEBAB_CASE_RE = /[A-Z \_]/;

function listPaths(paths: string[]) {
  return paths.map(path => ` - ${path}`).join('\n');
}

function matchesAnyGlob(path: string, globs: string[]) {
  return globs.some(glob =>
    minimatch(path, glob, {
      dot: true,
    })
  );
}

/**
 * IGNORE_DIRECTORY_GLOBS patterns match directories which should
 * be ignored from casing validation. When one of the parent directories
 * of a file matches these rules this function strips it from the
 * path that is validated.
 *
 * if `file = new File('foo/bar/BAZ/index.js')` and `/foo/bar/BAZ`
 * is matched by an `IGNORE_DIRECTORY_GLOBS` pattern then this
 * function will return 'index.js' and only that part of the path
 * will be validated.
 *
 * @param  {File} file
 * @return {string} pathToCheck
 */
function getPathWithoutIgnoredParents(file: File) {
  for (const parent of file.getRelativeParentDirs()) {
    if (matchesAnyGlob(parent, IGNORE_DIRECTORY_GLOBS)) {
      return relative(parent, file.getRelativePath());
    }
  }

  return file.getRelativePath();
}

/**
 * Check for directories in the passed File objects which match the
 * KEBAB_CASE_DIRECTORY_GLOBS and ensure that those directories use
 * kebab case
 */
function checkForKebabCase(log: ToolingLog, files: File[]) {
  const errorPaths = files
    .reduce(
      (acc, file) => {
        const parents = file.getRelativeParentDirs();

        return acc.concat(
          parents.filter(
            parent =>
              matchesAnyGlob(parent, KEBAB_CASE_DIRECTORY_GLOBS) &&
              NON_KEBAB_CASE_RE.test(basename(parent))
          )
        );
      },
      [] as string[]
    )
    .reduce((acc, path) => (acc.includes(path) ? acc : acc.concat(path)), [] as string[]);

  if (errorPaths.length) {
    log.error(`These directories MUST use kebab-case.\n${listPaths(errorPaths)}`);
    return false;
  }

  return true;
}

/**
 * Check that all passed File objects are using valid casing. Every
 * file SHOULD be using snake_case but some files are allowed to stray
 * based on casing_check_config.
 */
function checkForSnakeCase(log: ToolingLog, files: File[]) {
  const errorPaths: string[] = [];
  const warningPaths: string[] = [];

  files.forEach(file => {
    const path = file.getRelativePath();

    const ignored = matchesAnyGlob(path, IGNORE_FILE_GLOBS);
    if (ignored) {
      log.debug('%j ignored', file);
      return;
    }

    const pathToValidate = getPathWithoutIgnoredParents(file);
    const invalid = NON_SNAKE_CASE_RE.test(pathToValidate);
    if (!invalid) {
      log.debug('%j uses valid casing', file);
    } else {
      const ignoredParent = file.getRelativePath().slice(0, -pathToValidate.length);
      errorPaths.push(`${chalk.dim(ignoredParent)}${pathToValidate}`);
    }
  });

  if (warningPaths.length) {
    log.warning(`Filenames SHOULD be snake_case.\n${listPaths(warningPaths)}`);
  }

  if (errorPaths.length) {
    log.error(`Filenames MUST use snake_case.\n${listPaths(errorPaths)}`);
    return false;
  }

  return true;
}

export function checkFiles(log: ToolingLog, files: File[]) {
  return checkForKebabCase(log, files) && checkForSnakeCase(log, files);
}
