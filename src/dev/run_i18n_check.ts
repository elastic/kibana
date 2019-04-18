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

import { integrateLocaleFiles, mergeConfigs } from './i18n';
import { extractDefaultMessages } from './i18n/tasks';
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
    const defaultMessages = await extractDefaultMessages({ path, config });

    if (config.translations.length === 0) {
      return;
    }

    const list = new Listr(
      config.translations.map(translationsPath => ({
        task: async () => {
          // If `--fix` is set we should try apply all possible fixes and override translations file.
          await integrateLocaleFiles(defaultMessages, {
            sourceFileName: translationsPath,
            targetFileName: fix ? translationsPath : undefined,
            dryRun: !fix,
            ignoreIncompatible: fix || !!ignoreIncompatible,
            ignoreUnused: fix || !!ignoreUnused,
            ignoreMissing: fix || !!ignoreMissing,
            config,
            log,
          });
        },
        title: `Compatibility check with ${translationsPath}`,
      })),
      {
        concurrent: true,
        exitOnError: false,
      }
    );

    try {
      await list.run();
    } catch (error) {
      process.exitCode = 1;

      if (!error.errors) {
        log.error('Unhandled exception!');
        log.error(error);
        process.exit();
      }

      for (const e of error.errors) {
        log.error(e);
      }
    }
  },
  {
    flags: {
      allowUnexpected: true,
    },
  }
);
