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
import { I18nCheckTaskContext, MessageDescriptor } from '../types';

import {
  checkConfigs,
  mergeConfigs,
  checkUntrackedNamespacesTask,
  validateTranslationsTask,
  validateTranslationFiles,
} from '../tasks';
import { TaskReporter } from '../utils/task_reporter';

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
      // checks inside translation files
      'ignore-incompatible': ignoreIncompatible,
      'ignore-unused': ignoreUnused,

      // checks against codebase
      'ignore-malformed': ignoreMalformed,
      'ignore-untracked': ignoreUntracked,

      'include-config': includeConfig,
      namespace: namespace,
      fix = false,
      path,
    },
    log,
  }) => {
    if (
      fix &&
      (ignoreIncompatible !== undefined ||
        ignoreUnused !== undefined ||
        ignoreUntracked !== undefined ||
        ignoreMalformed !== undefined)
    ) {
      throw createFailError(
        `${chalk.white.bgRed(
          ' I18N ERROR '
        )} none of the --ignore-incompatible, --namespace, --ignore-unused, --ignore-malformed, --ignore-untracked is allowed when --fix is set.`
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

    if (
      (typeof ignoreIncompatible !== 'undefined' && typeof ignoreIncompatible !== 'boolean') ||
      (typeof ignoreUnused !== 'undefined' && typeof ignoreUnused !== 'boolean') ||
      (typeof ignoreMalformed !== 'undefined' && typeof ignoreMalformed !== 'boolean') ||
      (typeof ignoreUntracked !== 'undefined' && typeof ignoreUntracked !== 'boolean')
    ) {
      throw createFailError(
        `${chalk.white.bgRed(
          ' I18N ERROR '
        )} --ignore-incompatible, --ignore-malformed, --ignore-unused, and --ignore-untracked can't have a value`
      );
    }

    if (typeof namespace === 'boolean') {
      throw createFailError(`${chalk.white.bgRed(' I18N ERROR ')} --namespace require a value`);
    }

    const filterNamespaces = typeof namespace === 'string' ? [namespace] : namespace;

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
        {
          title: 'Validating i18n Messages',
          skip: skipOnNoTranslations,
          task: (context, task) =>
            validateTranslationsTask(context, task, {
              filterNamespaces,
              ignoreMalformed,
            }),
        },
        {
          title: 'Checking Untracked i18n Messages outside defined namespaces',
          enabled: (_) => !ignoreUntracked || !!(filterNamespaces && filterNamespaces.length),
          task: (context, task) => checkUntrackedNamespacesTask(context, task, { rootPaths }),
        },
        {
          title: 'Validating translation files',
          skip: skipOnNoTranslations,
          task: (context, task) =>
            validateTranslationFiles(context, task, {
              filterNamespaces,
              fix,
              ignoreIncompatible,
              ignoreUnused,
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
      const taskReporter = new TaskReporter();
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
