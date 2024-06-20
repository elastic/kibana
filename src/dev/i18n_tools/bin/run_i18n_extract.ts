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
import {
  checkConfigs,
  mergeConfigs,
  extractDefaultMessagesTask,
  writeExtractedMessagesToFile,
} from '../tasks';

const toolingLog = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

const runStartTime = Date.now();
const reportTime = getTimeReporter(toolingLog, 'scripts/i18n_check');

run(
  async ({
    flags: { path, 'output-dir': outputDir, 'include-config': includeConfig, namespace: namespace },
    log,
  }) => {
    if (!outputDir || typeof outputDir !== 'string') {
      throw createFailError(
        `${chalk.white.bgRed(' I18N ERROR ')} --output-dir option should be specified.`
      );
    }

    if (
      typeof path === 'boolean' ||
      typeof includeConfig === 'boolean' ||
      typeof namespace === 'boolean'
    ) {
      throw createFailError(
        `${chalk.white.bgRed(
          ' I18N ERROR '
        )} --namespace --path and --include-config require a value`
      );
    }

    const kibanaRootPaths = ['./src', './packages', './x-pack'];
    const rootPaths = Array().concat(path || kibanaRootPaths);
    const filterNamespaces = typeof namespace === 'string' ? [namespace] : namespace;

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
        {
          title: 'Extracting Default i18n Messages',
          task: (context, task) => extractDefaultMessagesTask(context, task, { filterNamespaces }),
        },
        {
          title: 'Writing Translations file',
          enabled: (ctx) => Boolean(outputDir && ctx.messages.size > 0),
          task: (context, task) => writeExtractedMessagesToFile(context, task, { outputDir }),
        },
      ],
      {
        concurrent: false,
        exitOnError: true,
        renderer: process.env.CI ? 'verbose' : ('default' as any),
      }
    );

    try {
      const messages: Map<string, { message: string }> = new Map();
      await list.run({ messages });

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
