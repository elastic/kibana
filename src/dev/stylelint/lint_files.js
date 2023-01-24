/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import stylelint from 'stylelint';
import path from 'path';
import { safeLoad } from 'js-yaml';
import fs from 'fs';
import { createFailError } from '@kbn/dev-cli-errors';

// load the include globs from .stylelintrc and convert them to regular expressions for filtering files
const stylelintPath = path.resolve(__dirname, '..', '..', '..', '.stylelintrc');
const styleLintConfig = safeLoad(fs.readFileSync(stylelintPath));

/**
 * Lints a list of files with eslint. eslint reports are written to the log
 * and a FailError is thrown when linting errors occur.
 *
 * @param  {ToolingLog} log
 * @param  {Array<File>} files
 * @return {undefined}
 */
export async function lintFiles(log, files) {
  const paths = files.map((file) => file.getRelativePath());

  const options = {
    files: paths,
    config: styleLintConfig,
    formatter: 'string',
    ignorePath: path.resolve(__dirname, '..', '..', '..', '.stylelintignore'),
  };

  const report = await stylelint.lint(options);
  if (report.errored) {
    log.error(report.output);
    throw createFailError('[stylelint] errors');
  } else {
    log.success('[stylelint] %d files linted successfully', files.length);
  }
}
