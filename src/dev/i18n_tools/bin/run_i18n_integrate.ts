/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Listr } from 'listr2';
import { run } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { getTimeReporter } from '@kbn/ci-stats-reporter';
import { ErrorReporter } from '../utils';
import { I18nCheckTaskContext, MessageDescriptor } from '../types';
import {
  checkConfigs,
  mergeConfigs,
  extractDefaultMessagesTask,
  integrateTranslations,
  validateTranslationFiles,
} from '../tasks';
import { flagFailError } from '../utils/verify_bin_flags';
import { TaskReporter } from '../utils/task_reporter';

const toolingLog = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

const runStartTime = Date.now();
const reportTime = getTimeReporter(toolingLog, 'scripts/i18n_check');

run(
  async ({
    flags: { source, target, 'include-config': includeConfig, 'dry-run': dryRun },
    log,
  }) => {
    if (typeof source !== 'string' || typeof target !== 'string') {
      throw flagFailError(`--target and --source options should be specified.`);
    }

    if (typeof includeConfig === 'boolean') {
      throw flagFailError(`--include-config require a value`);
    }

    if (typeof dryRun !== 'boolean') {
      throw flagFailError(`--dry-run can't have a value`);
    }

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
          task: (context, task) => extractDefaultMessagesTask(context, task, {}),
        },
        {
          title: 'Integrating Translation file',
          task: (context, task) => integrateTranslations(context, task, { source, target }),
        },
        {
          title: 'Validating translation files',
          task: (context, task) =>
            validateTranslationFiles(context, task, {
              fix: !dryRun,
              filterTranslationFiles: [target],
            }),
        },
      ],
      {
        concurrent: false,
        exitOnError: true,
        renderer: process.env.CI ? 'verbose' : ('default' as any),
      }
    );

    try {
      const messages: Map<string, MessageDescriptor[]> = new Map();
      const taskReporter = new TaskReporter({ toolingLog });
      await list.run({ messages, taskReporter });

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
