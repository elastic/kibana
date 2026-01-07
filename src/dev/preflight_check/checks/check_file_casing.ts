/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { relative, basename } from 'path';
import { dim } from 'chalk';
import { matchesAnyGlob } from '../../globs';

import {
  IGNORE_DIRECTORY_GLOBS,
  IGNORE_FILE_GLOBS,
  TEMPORARILY_IGNORED_PATHS,
  KEBAB_CASE_DIRECTORY_GLOBS,
} from '../../precommit_hook/casing_check_config';
import { File } from '../../file';
import { PreflightCheck } from './preflight_check';

const NON_SNAKE_CASE_RE = /[A-Z \-]/;
const NON_KEBAB_CASE_RE = /[A-Z \_]/;

function listPaths(paths: string[]) {
  return paths.map((path) => ` - ${path}`).join('\n');
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
 * keban case
 *
 * @param  {Array<File>} files
 * @return {Promise<undefined>}
 */
async function checkForKebabCase(files: File[]) {
  const errorPaths = files
    .reduce((acc, file) => {
      const parents = file.getRelativeParentDirs();

      return acc.concat(
        parents.filter(
          (parent) =>
            matchesAnyGlob(parent, KEBAB_CASE_DIRECTORY_GLOBS) &&
            NON_KEBAB_CASE_RE.test(basename(parent))
        )
      );
    }, [] as string[])
    .reduce((acc, path) => (acc.includes(path) ? acc : acc.concat(path)), [] as string[])
    .filter(Boolean);

  return errorPaths.length
    ? `These directories MUST use kebab-case.\n${listPaths(errorPaths)}`
    : undefined;
}

/**
 * Check that all passed File objects are using valid casing. Every
 * file SHOULD be using snake_case but some files are allowed to stray:
 *
 *  - eslint/babel packages: the directory name matches the module
 *    name, which uses kebab-case to mimic other babel/eslint plugins,
 *    configs, and presets
 *  - docs: unsure why, but all docs use kebab-case and that's fine
 *
 * @param {ToolingLog} log
 * @param {Array<File>} files
 * @return {Promise<undefined>}
 */
async function checkForSnakeCase(files: File[]) {
  const errorPaths: string[] = [];
  const warningPaths: string[] = [];

  const results: string[] = [];

  files.forEach((file) => {
    const path = file.getRelativePath();

    if (TEMPORARILY_IGNORED_PATHS.includes(path)) {
      warningPaths.push(file.getRelativePath());
      return;
    }

    const ignored = matchesAnyGlob(path, IGNORE_FILE_GLOBS);
    if (ignored) {
      return;
    }

    const pathToValidate = getPathWithoutIgnoredParents(file);
    const invalid = NON_SNAKE_CASE_RE.test(pathToValidate);
    if (invalid) {
      const ignoredParent = file.getRelativePath().slice(0, -pathToValidate.length);
      errorPaths.push(`${dim(ignoredParent)}${pathToValidate}`);
    }
  });

  if (errorPaths.length) {
    results.push(`Filenames MUST use snake_case.\n${listPaths(errorPaths)}`);
  }

  return results.length ? results : undefined;
}

export class FileCasingCheck extends PreflightCheck {
  id = 'fileCasing';

  public async runCheck() {
    const files = Array.from(this.files.values()).map(({ file }) => file);

    if (files.length === 0) {
      return { test: this.id, errors: [] };
    }

    const logs = [];

    const kebabCaseResponse = await checkForKebabCase(files);
    if (kebabCaseResponse) {
      logs.push(kebabCaseResponse);
    }

    const snakeCaseResponse = await checkForSnakeCase(files);
    if (snakeCaseResponse) {
      logs.push(snakeCaseResponse);
    }

    return { test: this.id, errors: logs.flatMap((l) => l) };
  }
}
