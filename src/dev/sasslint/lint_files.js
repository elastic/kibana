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
  const paths = files.map(file => file.getRelativePath());

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
