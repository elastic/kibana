/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { Listr } from 'listr2';
import { resolve } from 'path';

import { createFailError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import { ErrorReporter, serializeToJson, serializeToJson5, writeFileAsync } from './i18n';
import { extractDefaultMessages, mergeConfigs } from './i18n/tasks';
import { I18nCheckTaskContext } from './i18n/types';

run(
  async ({
    flags: {
      path,
      'output-dir': outputDir,
      'output-format': outputFormat,
      'include-config': includeConfig,
    },
    log,
  }) => {
    if (!outputDir || typeof outputDir !== 'string') {
      throw createFailError(
        `${chalk.white.bgRed(' I18N ERROR ')} --output-dir option should be specified.`
      );
    }

    if (typeof path === 'boolean' || typeof includeConfig === 'boolean') {
      throw createFailError(
        `${chalk.white.bgRed(' I18N ERROR ')} --path and --include-config require a value`
      );
    }
    const srcPaths = Array().concat(path || ['./src', './packages', './x-pack']);

    const list = new Listr<I18nCheckTaskContext>(
      [
        {
          title: 'Merging .i18nrc.json files',
          task: (context, task) =>
            task.newListr(mergeConfigs(includeConfig), { exitOnError: true }),
        },
        {
          title: 'Extracting Default Messages',
          task: (context, task) =>
            task.newListr(extractDefaultMessages(context.config!, srcPaths), { exitOnError: true }),
        },
        {
          title: 'Writing to file',
          enabled: (ctx) => Boolean(outputDir && ctx.messages.size > 0),
          task: async (context) => {
            const sortedMessages = [...context.messages].sort(([key1], [key2]) =>
              key1.localeCompare(key2)
            );
            await writeFileAsync(
              resolve(outputDir, 'en.json'),
              outputFormat === 'json5'
                ? serializeToJson5(sortedMessages)
                : serializeToJson(sortedMessages)
            );
          },
        },
      ],
      {
        renderer: process.env.CI ? 'verbose' : ('default' as any),
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
    process.exit();
  },
  {
    flags: {
      allowUnexpected: true,
      guessTypesForUnexpectedFlags: true,
    },
  }
);
