import { dirname } from 'path';

import { CLIEngine } from 'eslint';

import { createFailError } from '../run';

const ROOT = dirname(require.resolve('../../../package.json'));

/**
 * Lints a list of files with eslint. eslint reports are written to the log
 * and a FailError is thrown when linting errors occur.
 *
 * @param  {ToolingLog} log
 * @param  {Array<File>} files
 * @return {undefined}
 */
export function lintFiles(log, files) {
  const cli = new CLIEngine({
    cache: true,
    cwd: ROOT,
  });

  const paths = files.map(file => file.getRelativePath());
  const report = cli.executeOnFiles(paths);

  const failTypes = [];
  if (report.errorCount > 0) failTypes.push('errors');
  if (report.warningCount > 0) failTypes.push('warning');

  if (!failTypes.length) {
    log.success('%d files linted successfully', files.length);
    return;
  }

  log.error(cli.getFormatter()(report.results));
  throw createFailError(`eslint ${failTypes.join(' & ')}`, 1);
}
