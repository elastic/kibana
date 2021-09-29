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
import { createFailError } from '@kbn/dev-utils';

// load the include globs from .stylelintrc and convert them to regular expressions for filtering files
const stylelintPath = path.resolve(__dirname, '..', '..', '..', '.stylelintrc');
const styleLintConfig = safeLoad(fs.readFileSync(stylelintPath));

// For files living on the filesystem
function lintFilesOnFS(files) {
  const paths = files.map((file) => file.getRelativePath());

  const options = {
    files: paths,
    config: styleLintConfig,
    formatter: 'string',
    ignorePath: path.resolve(__dirname, '..', '..', '..', '.stylelintignore'),
  };

  return stylelint.lint(options);
}

// For files living somewhere else (ie. git object)
async function lintFilesOnContent(files) {
  const report = {
    errored: false,
    output: '',
    postcssResults: [],
    results: [],
    maxWarningsExceeded: {
      maxWarnings: 0,
      foundWarnings: 0,
    },
  };

  for (let i = 0; i < files.length; i++) {
    const options = {
      code: await files[i].getContent(),
      config: styleLintConfig,
      formatter: 'string',
      ignorePath: path.resolve(__dirname, '..', '..', '..', '.stylelintignore'),
    };
    const r = await stylelint.lint(options);
    report.errored = report.errored || r.errored;
    report.output += r.output
      .replace('<input css ' + (i + 1) + '>', files[i].getRelativePath())
      .slice(0, -1);
    report.postcssResults.push(...(r.postcssResults || []));
    report.maxWarnings = r.maxWarnings;
    report.foundWarnings += r.foundWarnings;
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
export async function lintFiles(log, files) {
  const virtualFilesCount = files.filter((file) => file.isVirtual()).length;
  const report = virtualFilesCount ? await lintFilesOnContent(files) : await lintFilesOnFS(files);

  if (report.errored) {
    log.error(report.output);
    throw createFailError('[stylelint] errors');
  } else {
    log.success('[stylelint] %d files linted successfully', files.length);
  }
}
