/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Listr } from 'listr2';
import { run } from '@kbn/dev-cli-runner';

import {
  createTaskContext,
  ErrorReporter,
  parseConfigsTask,
  extractCollectorsTask,
  generateSchemasTask,
  writeToFileTask,
} from '../tools/tasks';

export function runTelemetryExtract() {
  run(
    async ({ flags: {}, log }) => {
      const list = new Listr(
        [
          {
            title: 'Parsing .telemetryrc.json files',
            task: (context, task) => task.newListr(parseConfigsTask(), { exitOnError: true }),
          },
          {
            title: 'Extracting Telemetry Collectors',
            task: (context, task) =>
              task.newListr(extractCollectorsTask(context), { exitOnError: true }),
          },
          {
            title: 'Generating Schema files',
            task: (context, task) =>
              task.newListr(generateSchemasTask(context), { exitOnError: true }),
          },
          {
            title: 'Writing to file',
            task: (context, task) => task.newListr(writeToFileTask(context), { exitOnError: true }),
          },
        ],
        {
          renderer: process.env.CI ? 'verbose' : 'default',
        }
      );

      try {
        const context = createTaskContext();
        await list.run(context);
      } catch (error) {
        process.exitCode = 1;
        if (error instanceof ErrorReporter) {
          error.errors.forEach((e: string | Error) => log.error(e));
        } else {
          log.error('Unhandled exception');
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
}
