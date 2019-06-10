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
import { resolve } from 'path';

import { mergeConfigs, serializeToJson, serializeToJson5, writeFileAsync } from './i18n';
import { extractDefaultMessages } from './i18n/tasks';
import { createFailError, run } from './run';

run(
  async ({
    flags: {
      path,
      'output-dir': outputDir,
      'output-format': outputFormat,
      'include-config': includeConfig,
    },
  }) => {
    if (!outputDir || typeof outputDir !== 'string') {
      throw createFailError(
        `${chalk.white.bgRed(' I18N ERROR ')} --output-dir option should be specified.`
      );
    }

    if (typeof path === 'boolean' || typeof includeConfig === 'boolean') {
      throw createFailError(
        `${chalk.white.bgRed(' I18N ERROR ')} --path and --include-config require a value`
      );
    }

    const config = await mergeConfigs(includeConfig);
    const defaultMessages = await extractDefaultMessages({ path, config });

    // Messages shouldn't be written to a file if output is not supplied.
    if (!outputDir || !defaultMessages.size) {
      return;
    }

    const sortedMessages = [...defaultMessages].sort(([key1], [key2]) => key1.localeCompare(key2));
    await writeFileAsync(
      resolve(outputDir, 'en.json'),
      outputFormat === 'json5' ? serializeToJson5(sortedMessages) : serializeToJson(sortedMessages)
    );
  },
  {
    flags: {
      allowUnexpected: true,
    },
  }
);
