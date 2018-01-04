import { relative } from 'path';
import { createFailError } from '../run';
import { matchesAnyGlob } from '../globs';

import {
  IGNORE_DIRECTORY_GLOBS,
  IGNORE_FILE_GLOBS,
  TEMPORARILY_IGNORED_PATHS,
} from './casing_check_config';

const NON_SNAKE_CASE_RE = /[A-Z \-]/;

function listFileNames(files) {
  return files
    .map(file => ` - ${file.getRelativePath()}`)
    .join('\n');
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
function getPathWithoutIgnoredParents(file) {
  for (const parent of file.getRelativeParentDirs()) {
    if (matchesAnyGlob(parent, IGNORE_DIRECTORY_GLOBS)) {
      return relative(parent, file.getRelativePath());
    }
  }

  return file.getRelativePath();
}

/**
 * Check that all passed File objects are using valid casing. Every
 * file SHOULD be using snake_case but some files are allowed to stray:
 *
 *  - grunt config: the file name needs to match the module name
 *  - eslint/babel packages: the directory name matches the module
 *    name, which uses kebab-case to mimic other babel/eslint plugins,
 *    configs, and presets
 *  - docs: unsure why, but all docs use kebab-case and that's fine
 *
 * @param {ToolingLog} log
 * @param {Array<File>} files
 * @return {Promise<undefined>}
 */
export async function checkFileCasing(log, files) {
  const errors = [];
  const warnings = [];

  files.forEach(file => {
    const path = file.getRelativePath();

    if (TEMPORARILY_IGNORED_PATHS.includes(path)) {
      warnings.push(file);
      return;
    }

    const ignored = matchesAnyGlob(path, IGNORE_FILE_GLOBS);
    if (ignored) {
      log.debug('%j ignored', file);
      return;
    }

    const invalid = NON_SNAKE_CASE_RE.test(getPathWithoutIgnoredParents(file));
    if (!invalid) {
      log.debug('%j uses valid casing', file);
    } else {
      errors.push(file);
    }
  });

  if (warnings.length) {
    log.warning(`Filenames SHOULD be snake_case.\n${listFileNames(warnings)}`);
  }

  if (errors.length) {
    throw createFailError(`Filenames MUST use snake_case.\n${listFileNames(errors)}`);
  }
}
