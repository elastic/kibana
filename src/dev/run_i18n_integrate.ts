/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import chalk from 'chalk';
import Listr from 'listr';

import { createFailError, run } from '@kbn/dev-utils';
import { ErrorReporter, integrateLocaleFiles } from './i18n';
import { extractDefaultMessages, mergeConfigs } from './i18n/tasks';

run(
  async ({
    flags: {
      'dry-run': dryRun = false,
      'ignore-incompatible': ignoreIncompatible = false,
      'ignore-missing': ignoreMissing = false,
      'ignore-unused': ignoreUnused = false,
      'ignore-malformed': ignoreMalformed = false,
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
      typeof ignoreMalformed !== 'boolean' ||
      typeof dryRun !== 'boolean'
    ) {
      throw createFailError(
        `${chalk.white.bgRed(
          ' I18N ERROR '
        )} --ignore-incompatible, --ignore-unused, --ignore-malformed, --ignore-missing, and --dry-run can't have values`
      );
    }

    const srcPaths = Array().concat(path || ['./src', './packages', './x-pack']);

    const list = new Listr([
      {
        title: 'Merging .i18nrc.json files',
        task: () => new Listr(mergeConfigs(includeConfig), { exitOnError: true }),
      },
      {
        title: 'Extracting Default Messages',
        task: ({ config }) =>
          new Listr(extractDefaultMessages(config, srcPaths), { exitOnError: true }),
      },
      {
        title: 'Integrating Locale File',
        task: async ({ messages, config }) => {
          await integrateLocaleFiles(messages, {
            sourceFileName: source,
            targetFileName: target,
            dryRun,
            ignoreIncompatible,
            ignoreUnused,
            ignoreMissing,
            ignoreMalformed,
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
      process.exitCode = 0;
    } catch (error) {
      process.exitCode = 1;
      if (error instanceof ErrorReporter) {
        error.errors.forEach((e: string | Error) => log.error(e));
      } else {
        log.error('Unhandled exception!');
        log.error(error);
      }
    }
    process.exit();
  },
  {
    flags: {
      allowUnexpected: true,
      guessTypesForUnexpectedFlags: true,
    },
  }
);
