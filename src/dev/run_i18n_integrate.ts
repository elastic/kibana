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

import { ErrorReporter, integrateLocaleFiles, mergeConfigs } from './i18n';
import { extractDefaultMessages } from './i18n/tasks';
import { createFailError, run } from './run';

run(
  async ({
    flags: {
      'dry-run': dryRun = false,
      'ignore-incompatible': ignoreIncompatible = false,
      'ignore-missing': ignoreMissing = false,
      'ignore-unused': ignoreUnused = false,
      'include-config': includeConfig,
      path,
      source,
      target,
    },
    log,
  }) => {
    if (!source || typeof source === 'boolean') {
      throw createFailError(`${chalk.white.bgRed(' I18N ERROR ')} --source option isn't provided.`);
    }

    if (Array.isArray(source)) {
      throw createFailError(
        `${chalk.white.bgRed(' I18N ERROR ')} --source should be specified only once.`
      );
    }

    if (typeof target === 'boolean' || Array.isArray(target)) {
      throw createFailError(
        `${chalk.white.bgRed(
          ' I18N ERROR '
        )} --target should be specified only once and must have a value.`
      );
    }

    if (typeof path === 'boolean' || typeof includeConfig === 'boolean') {
      throw createFailError(
        `${chalk.white.bgRed(' I18N ERROR ')} --path and --include-config require a value`
      );
    }

    if (
      typeof ignoreIncompatible !== 'boolean' ||
      typeof ignoreUnused !== 'boolean' ||
      typeof ignoreMissing !== 'boolean' ||
      typeof dryRun !== 'boolean'
    ) {
      throw createFailError(
        `${chalk.white.bgRed(
          ' I18N ERROR '
        )} --ignore-incompatible, --ignore-unused, --ignore-missing, and --dry-run can't have values`
      );
    }

    const config = await mergeConfigs(includeConfig);
    const list = new Listr([
      {
        title: 'Extracting Default Messages',
        task: () => new Listr(extractDefaultMessages({ path, config }), { exitOnError: true }),
      },
      {
        title: 'Intregrating Locale File',
        task: async ({ messages }) => {
          await integrateLocaleFiles(messages, {
            sourceFileName: source,
            targetFileName: target,
            dryRun,
            ignoreIncompatible,
            ignoreUnused,
            ignoreMissing,
            config,
            log,
          });
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
