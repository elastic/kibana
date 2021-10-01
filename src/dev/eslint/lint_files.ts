/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CLIEngine } from 'eslint';

import { REPO_ROOT } from '@kbn/utils';
import { createFailError, ToolingLog } from '@kbn/dev-utils';
import { File } from '../file';

// For files living on the filesystem
function lintFilesOnFS(cli: CLIEngine, files: File[]) {
  const paths = files.map((file) => file.getRelativePath());
  return cli.executeOnFiles(paths);
}

// For files living somewhere else (ie. git object)
async function lintFilesOnContent(cli: CLIEngine, files: File[]) {
  const report: {
    results: any[];
    errorCount: number;
    warningCount: number;
    fixableErrorCount: number;
    fixableWarningCount: number;
  } = {
    results: [],
    errorCount: 0,
    warningCount: 0,
    fixableErrorCount: 0,
    fixableWarningCount: 0,
  };

  for (let i = 0; i < files.length; i++) {
    const r = cli.executeOnText(await files[i].getContent(), files[i].getRelativePath());
    // Despite a relative path was given, the result would contain an absolute one. Work around it.
    r.results[0].filePath = r.results[0].filePath.replace(
      files[i].getAbsolutePath(),
      files[i].getRelativePath()
    );
    report.results.push(...r.results);
    report.errorCount += r.errorCount;
    report.warningCount += r.warningCount;
    report.fixableErrorCount += r.fixableErrorCount;
    report.fixableWarningCount += r.fixableWarningCount;
  }

  return report;
}

/**
 * Lints a list of files with eslint. eslint reports are written to the log
 * and a FailError is thrown when linting errors occur.
 *
 * @param  {ToolingLog} log
 * @param  {Array<File>} files
 * @return {undefined}
 */
export async function lintFiles(log: ToolingLog, files: File[], { fix }: { fix?: boolean } = {}) {
  const cli = new CLIEngine({
    cache: true,
    cwd: REPO_ROOT,
    fix,
  });

  const virtualFilesCount = files.filter((file) => file.isVirtual()).length;
  const report =
    virtualFilesCount && !fix ? await lintFilesOnContent(cli, files) : lintFilesOnFS(cli, files);

  if (fix) {
    CLIEngine.outputFixes(report);
  }

  const failTypes = [];
  if (report.errorCount > 0) failTypes.push('errors');
  if (report.warningCount > 0) failTypes.push('warning');

  if (!failTypes.length) {
    log.success('[eslint] %d files linted successfully', files.length);
    return;
  }

  log.error(cli.getFormatter()(report.results));
  throw createFailError(`[eslint] ${failTypes.join(' & ')}`);
}
