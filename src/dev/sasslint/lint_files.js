/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import sassLint from 'sass-lint';
import path from 'path';
import { createFailError } from '@kbn/dev-utils';

/**
 * Lints a list of files with eslint. eslint reports are written to the log
 * and a FailError is thrown when linting errors occur.
 *
 * @param  {ToolingLog} log
 * @param  {Array<File>} files
 * @return {undefined}
 */
export function lintFiles(log, files) {
  const paths = files.map((file) => file.getRelativePath());

  const report = sassLint.lintFiles(
    paths.join(', '),
    {},
    path.resolve(__dirname, '..', '..', '..', '.sass-lint.yml')
  );

  const failTypes = Object.keys(
    report.reduce((failTypes, reportEntry) => {
      if (reportEntry.warningCount > 0) failTypes.warning = true;
      if (reportEntry.errorCount > 0) failTypes.errors = true;
      return failTypes;
    }, {})
  );

  if (!failTypes.length) {
    log.success('[sasslint] %d files linted successfully', files.length);
    return;
  }

  log.error(sassLint.format(report));
  throw createFailError(`[sasslint] ${failTypes.join(' & ')}`);
}
