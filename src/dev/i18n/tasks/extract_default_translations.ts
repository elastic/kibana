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

import chalk from 'chalk';
import { createFailError } from '@kbn/dev-utils';
import { ErrorReporter, extractMessagesFromPathToMap, filterConfigPaths, I18nConfig } from '..';

export function extractDefaultMessages(config: I18nConfig, inputPaths: string[]) {
  const filteredPaths = filterConfigPaths(inputPaths, config) as string[];
  if (filteredPaths.length === 0) {
    throw createFailError(
      `${chalk.white.bgRed(
        ' I18N ERROR '
      )} None of input paths is covered by the mappings in .i18nrc.json.`
    );
  }
  return filteredPaths.map(filteredPath => ({
    task: async (context: {
      messages: Map<string, { message: string }>;
      reporter: ErrorReporter;
    }) => {
      const { messages, reporter } = context;
      const initialErrorsNumber = reporter.errors.length;

      // Return result if no new errors were reported for this path.
      const result = await extractMessagesFromPathToMap(filteredPath, messages, config, reporter);
      if (reporter.errors.length === initialErrorsNumber) {
        return result;
      }

      throw reporter;
    },
    title: filteredPath,
  }));
}
