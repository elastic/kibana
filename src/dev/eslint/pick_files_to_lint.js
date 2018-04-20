import { CLIEngine } from 'eslint';

/**
 * Filters a list of files to only include lintable files.
 *
 * @param  {ToolingLog} log
 * @param  {Array<File>} files
 * @return {Array<File>}
 */
export function pickFilesToLint(log, files) {
  const cli = new CLIEngine();

  return files.filter(file => {
    if (!file.isJs()) {
      return;
    }

    const path = file.getRelativePath();

    if (cli.isPathIgnored(path)) {
      log.warning(`%j ignored by .eslintignore`, file);
      return false;
    }

    log.debug('linting %j', file);
    return true;
  });
}
