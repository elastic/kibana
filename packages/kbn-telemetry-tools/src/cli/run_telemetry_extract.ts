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
