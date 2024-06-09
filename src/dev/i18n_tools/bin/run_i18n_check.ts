/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { Listr } from 'listr2';

import { createFailError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { getTimeReporter } from '@kbn/ci-stats-reporter';
import { ErrorReporter } from '../utils';
import { I18nCheckTaskContext } from '../types';
import { checkConfigs, mergeConfigs, checkUntrackedNamespacesTask } from '../tasks';

const toolingLog = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

const runStartTime = Date.now();
const reportTime = getTimeReporter(toolingLog, 'scripts/i18n_check');

const skipOnNoTranslations = ({ config }: I18nCheckTaskContext) =>
  !config?.translations.length && 'No translations found.';

run(
  async ({
    flags: {
      'ignore-incompatible': ignoreIncompatible,
      'ignore-malformed': ignoreMalformed,
      'ignore-missing': ignoreMissing,
      'ignore-unused': ignoreUnused,
      'include-config': includeConfig,
      'ignore-untracked': ignoreUntracked,
      fix = false,
      path,
    },
    log,
  }) => {
    if (
      fix &&
      (ignoreIncompatible !== undefined ||
        ignoreUnused !== undefined ||
        ignoreMalformed !== undefined ||
        ignoreMissing !== undefined ||
        ignoreUntracked !== undefined)
    ) {
      throw createFailError(
        `${chalk.white.bgRed(
          ' I18N ERROR '
        )} none of the --ignore-incompatible, --ignore-malformed, --ignore-unused or --ignore-missing,  --ignore-untracked is allowed when --fix is set.`
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

    const kibanaRootPaths = ['./src', './packages', './x-pack'];
    const rootPaths = Array().concat(path || kibanaRootPaths);

    const list = new Listr<I18nCheckTaskContext>(
      [
        {
          title: 'Checking .i18nrc.json files',
          task: (context, task) =>
            task.newListr(checkConfigs(includeConfig), { exitOnError: true }),
        },
        {
          title: 'Merging .i18nrc.json files',
          task: (context, task) =>
            task.newListr(mergeConfigs(includeConfig), { exitOnError: true }),
        },
        // {
        //   title: 'Validating i18n Messages',
        //   skip: skipOnNoTranslations,
        //   task: (context, task) => validateTranslationsTask(context, task, {}),
        // },
        // {
        //   title: 'Checking Untracked i18n Messages outside defined namespaces',
        //   enabled: (_) => !ignoreUntracked,
        //   task: (context, task) => checkUntrackedNamespacesTask(context, task, { rootPaths }),
        // },
        {
          title: 'Validating translation files',
          skip: skipOnNoTranslations,
          task: (context, task) => checkUntrackedNamespacesTask(context, task, { rootPaths }),
        },
      ],
      {
        concurrent: false,
        exitOnError: true,
        renderer: process.env.CI ? 'verbose' : ('default' as any),
      }
    );

    try {
      const errorReporter = new ErrorReporter();
      const messages: Map<string, { message: string }> = new Map();
      await list.run({ messages, errorReporter });

      reportTime(runStartTime, 'total', {
        success: true,
      });
    } catch (error) {
      process.exitCode = 1;
      if (error instanceof ErrorReporter) {
        error.errors.forEach((e: string | Error) => log.error(e));
        reportTime(runStartTime, 'error', {
          success: false,
        });
      } else {
        log.error('Unhandled exception!');
        log.error(error);
        reportTime(runStartTime, 'error', {
          success: false,
          error: error.message,
        });
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
