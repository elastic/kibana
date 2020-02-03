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

import { createFailError, run } from '@kbn/dev-utils';
import { ErrorReporter, I18nConfig } from './i18n';
import {
  extractDefaultMessages,
  extractUntrackedMessages,
  checkCompatibility,
  checkConfigs,
  mergeConfigs,
} from './i18n/tasks';

const skipNoTranslations = ({ config }: { config: I18nConfig }) => !config.translations.length;

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

    const srcPaths = Array().concat(path || ['./src', './packages', './x-pack']);

    const list = new Listr(
      [
        {
          title: 'Checking .i18nrc.json files',
          task: () => new Listr(checkConfigs(includeConfig), { exitOnError: true }),
        },
        {
          title: 'Merging .i18nrc.json files',
          task: () => new Listr(mergeConfigs(includeConfig), { exitOnError: true }),
        },
        {
          title: 'Checking For Untracked Messages based on .i18nrc.json',
          skip: skipNoTranslations,
          task: ({ config }) =>
            new Listr(extractUntrackedMessages(srcPaths), { exitOnError: true }),
        },
        {
          title: 'Validating Default Messages',
          skip: skipNoTranslations,
          task: ({ config }) =>
            new Listr(extractDefaultMessages(config, srcPaths), { exitOnError: true }),
        },
        {
          title: 'Compatibility Checks',
          skip: skipNoTranslations,
          task: ({ config }) =>
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
      guessTypesForUnexpectedFlags: true,
    },
  }
);
