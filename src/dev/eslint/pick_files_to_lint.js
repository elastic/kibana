import { CLIEngine } from 'eslint';

import { matchesAnyGlob } from '../globs';
import { DEFAULT_ESLINT_PATHS } from './default_eslint_paths';

/**
 * Filters a list of files that should be linted. This is done by comparing the
 * file name against the default eslint patterns (used when executing the eslint
 * script without arguments) and then filtering those files by the eslint ignored
 * paths in .eslintignore.
 *
 * When any JS file is ignored by either mechanism a warning message is logged.
 *
 * @param  {ToolingLog} log
 * @param  {Array<File>} files
 * @return {Array<File>}
 */
export function pickFilesToLint(log, files) {
  const cli = new CLIEngine();
  const sourcePathGlobs = cli.resolveFileGlobPatterns(DEFAULT_ESLINT_PATHS);

  return files.filter(file => {
    const path = file.getRelativePath();
    const isNormallyLinted = matchesAnyGlob(path, sourcePathGlobs);
    const isExplicitlyIgnored = isNormallyLinted && cli.isPathIgnored(path);

    if (isNormallyLinted && !isExplicitlyIgnored) {
      log.debug('linting %j', file);
      return true;
    }

    // warn about modified JS files that are not being linted
    if (!isNormallyLinted && file.isJs()) {
      log.warning('%j not selected by src/dev/eslint/default_eslint_paths', file);
    }

    // warn about modified JS files that are explicitly excluded from linting
    if (isExplicitlyIgnored && file.isJs()) {
      log.warning(`%j ignored by .eslintignore`, file);
    }

    return false;
  });
}
