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
import Listr from 'listr';

import { ErrorReporter, extractMessagesFromPathToMap, filterConfigPaths, I18nConfig } from '..';
import { createFailError } from '../../run';

export async function extractDefaultMessages({
  path,
  config,
}: {
  path?: string | string[];
  config: I18nConfig;
}) {
  const filteredPaths = filterConfigPaths(Array.isArray(path) ? path : [path || './'], config);
  if (filteredPaths.length === 0) {
    throw createFailError(
      `${chalk.white.bgRed(
        ' I18N ERROR '
      )} None of input paths is covered by the mappings in .i18nrc.json.`
    );
  }

  const reporter = new ErrorReporter();

  const list = new Listr(
    filteredPaths.map(filteredPath => ({
      task: async (messages: Map<string, unknown>) => {
        const initialErrorsNumber = reporter.errors.length;

        // Return result if no new errors were reported for this path.
        const result = await extractMessagesFromPathToMap(filteredPath, messages, config, reporter);
        if (reporter.errors.length === initialErrorsNumber) {
          return result;
        }

        // Throw an empty error to make Listr mark the task as failed without any message.
        throw new Error('');
      },
      title: filteredPath,
    })),
    {
      exitOnError: false,
    }
  );

  try {
    return await list.run(new Map());
  } catch (error) {
    if (error.name === 'ListrError' && reporter.errors.length) {
      throw createFailError(reporter.errors.join('\n\n'));
    }

    throw error;
  }
}
