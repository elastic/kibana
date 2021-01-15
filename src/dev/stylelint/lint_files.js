/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import stylelint from 'stylelint';
import path from 'path';
import { safeLoad } from 'js-yaml';
import fs from 'fs';
import { createFailError } from '@kbn/dev-utils';

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
