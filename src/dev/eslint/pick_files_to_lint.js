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
    if (!file.isJs() && !file.isTypescript()) {
      return;
    }

    const path = file.getRelativePath();

    if (cli.isPathIgnored(path)) {
      log.warning(`[eslint] %j ignored by .eslintignore`, file);
      return false;
    }

    log.debug('[eslint] linting %j', file);
    return true;
  });
}
