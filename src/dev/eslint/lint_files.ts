/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CLIEngine } from 'eslint';

import { REPO_ROOT } from '@kbn/repo-info';
import { createFailError } from '@kbn/dev-cli-errors';
import { ToolingLog } from '@kbn/tooling-log';
import { File } from '../file';

/**
 * Lints a list of files with eslint. eslint reports are written to the log
 * and a FailError is thrown when linting errors occur.
 *
 * @param  {ToolingLog} log
 * @param  {Array<File>} files
 * @return {undefined}
 */
export function lintFiles(log: ToolingLog, files: File[], { fix }: { fix?: boolean } = {}) {
  const cli = new CLIEngine({
    cache: true,
    cwd: REPO_ROOT,
    fix,
  });

  const paths = files.map((file) => file.getRelativePath());
  const report = cli.executeOnFiles(paths);

  if (fix) {
    CLIEngine.outputFixes(report);
  }

  if (report.errorCount || report.warningCount) {
    log[report.errorCount ? 'error' : 'warning'](cli.getFormatter()(report.results));
  }

  if (report.errorCount) {
    throw createFailError(`[eslint] errors`);
  }

  log.success('[eslint] %d files linted successfully', files.length);
}
