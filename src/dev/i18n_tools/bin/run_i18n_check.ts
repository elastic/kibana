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
import { isFailError } from '@kbn/dev-cli-errors';
import { I18nCheckTaskContext, MessageDescriptor } from '../types';

import {
  checkConfigs,
  mergeConfigs,
  checkUntrackedNamespacesTask,
  validateTranslationsTask,
  validateTranslationFiles,
} from '../tasks';
import { TaskReporter } from '../utils/task_reporter';
import { flagFailError, isDefined, undefinedOrBoolean } from '../utils/verify_bin_flags';

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
      (isDefined(ignoreIncompatible) ||
        isDefined(ignoreUnused) ||
        isDefined(ignoreUntracked) ||
        isDefined(ignoreMalformed))
    ) {
      throw flagFailError(
        `none of the --ignore-incompatible, --namespace, --ignore-unused, --ignore-malformed, --ignore-untracked is allowed when --fix is set.`
      );
    }

    if (typeof path === 'boolean' || typeof includeConfig === 'boolean') {
      throw flagFailError(`--path and --include-config require a value`);
    }

    if (
      !undefinedOrBoolean(fix) ||
      !undefinedOrBoolean(ignoreIncompatible) ||
      !undefinedOrBoolean(ignoreUnused) ||
      !undefinedOrBoolean(ignoreMalformed) ||
      !undefinedOrBoolean(ignoreUntracked)
    ) {
      throw flagFailError(
        `--fix, --ignore-incompatible, --ignore-malformed, --ignore-unused, and --ignore-untracked can't have a value`
      );
    }

    if (typeof namespace === 'boolean') {
      throw flagFailError(`--namespace require a value`);
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
      const taskReporter = new TaskReporter({ toolingLog });
      await list.run({ messages, taskReporter });

      reportTime(runStartTime, 'total', {
        success: true,
      });
    } catch (error) {
      process.exitCode = 1;

      if (isFailError(error)) {
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
