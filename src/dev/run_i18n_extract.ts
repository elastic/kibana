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
import { resolve } from 'path';

import {
  ErrorReporter,
  mergeConfigs,
  serializeToJson,
  serializeToJson5,
  writeFileAsync,
} from './i18n';
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
    log,
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

    const list = new Listr([
      {
        title: 'Extracting Default Messages',
        task: () => new Listr(extractDefaultMessages({ path, config }), { exitOnError: true }),
      },
      {
        title: 'Writing to file',
        enabled: ctx => outputDir && ctx.messages.size,
        task: async ctx => {
          const sortedMessages = [...ctx.messages].sort(([key1], [key2]) =>
            key1.localeCompare(key2)
          );
          await writeFileAsync(
            resolve(outputDir, 'en.json'),
            outputFormat === 'json5'
              ? serializeToJson5(sortedMessages)
              : serializeToJson(sortedMessages)
          );
        },
      },
    ]);

    try {
      const reporter = new ErrorReporter();
      const messages: Map<string, { message: string }> = new Map();
      await list.run({ messages, reporter });
    } catch (error) {
      process.exitCode = 1;
      if (error instanceof ErrorReporter) {
        error.errors.forEach((e: string | Error) => log.error(e));
      } else {
        log.error('Unhandled exception!');
        log.error(error);
      }
    }
  },
  {
    flags: {
      allowUnexpected: true,
    },
  }
);
