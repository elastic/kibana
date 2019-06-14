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

import { ErrorReporter, mergeConfigs } from './i18n';
import { extractDefaultMessages, extractUntrackedMessages, checkCompatibility } from './i18n/tasks';
import { createFailError, run } from './run';

run(
  async ({
    flags: {
      'ignore-incompatible': ignoreIncompatible,
      'ignore-missing': ignoreMissing,
      'ignore-unused': ignoreUnused,
      'include-config': includeConfig,
      fix = false,
      path,
    },
    log,
  }) => {
    if (
      fix &&
      (ignoreIncompatible !== undefined ||
        ignoreUnused !== undefined ||
        ignoreMissing !== undefined)
    ) {
      throw createFailError(
        `${chalk.white.bgRed(
          ' I18N ERROR '
        )} none of the --ignore-incompatible, --ignore-unused or --ignore-missing is allowed when --fix is set.`
      );
    }

    if (typeof path === 'boolean' || typeof includeConfig === 'boolean') {
      throw createFailError(
        `${chalk.white.bgRed(' I18N ERROR ')} --path and --include-config require a value`
      );
    }

    if (typeof fix !== 'boolean') {
      throw createFailError(`${chalk.white.bgRed(' I18N ERROR ')} --fix can't have a value`);
    }

    const config = await mergeConfigs(includeConfig);
    const srcPaths = Array().concat(path || ['./src', './packages', './x-pack']);

    if (config.translations.length === 0) {
      return;
    }

    const list = new Listr(
      [
        {
          title: 'Checking For Untracked Messages',
          task: () => new Listr(extractUntrackedMessages(srcPaths, config), { exitOnError: true }),
        },
        {
          title: 'Validating Default Messages',
          task: () =>
            new Listr(extractDefaultMessages({ path: srcPaths, config }), { exitOnError: true }),
        },
        {
          title: 'Compatibility Checks',
          task: () =>
            new Listr(
              checkCompatibility(
                config,
                {
                  ignoreIncompatible: !!ignoreIncompatible,
                  ignoreUnused: !!ignoreUnused,
                  ignoreMissing: !!ignoreMissing,
                  fix,
                },
                log
              ),
              { exitOnError: true }
            ),
        },
      ],
      {
        concurrent: false,
        exitOnError: true,
      }
    );

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
