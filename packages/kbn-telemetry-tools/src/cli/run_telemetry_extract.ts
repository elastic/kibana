/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Listr from 'listr';
import { run } from '@kbn/dev-utils';

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
      const list = new Listr([
        {
          title: 'Parsing .telemetryrc.json files',
          task: () => new Listr(parseConfigsTask(), { exitOnError: true }),
        },
        {
          title: 'Extracting Telemetry Collectors',
          task: (context) => new Listr(extractCollectorsTask(context), { exitOnError: true }),
        },
        {
          title: 'Generating Schema files',
          task: (context) => new Listr(generateSchemasTask(context), { exitOnError: true }),
        },
        {
          title: 'Writing to file',
          task: (context) => new Listr(writeToFileTask(context), { exitOnError: true }),
        },
      ]);

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
