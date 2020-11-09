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
import chalk from 'chalk';
import { createFailError, run } from '@kbn/dev-utils';

import {
  createTaskContext,
  ErrorReporter,
  parseConfigsTask,
  extractCollectorsTask,
  checkMatchingSchemasTask,
  generateSchemasTask,
  checkCompatibleTypesTask,
  writeToFileTask,
  TaskContext,
} from '../tools/tasks';

export function runTelemetryCheck() {
  run(
    async ({ flags: { fix = false, 'ignore-stored-json': ignoreStoredJson, path }, log }) => {
      if (typeof fix !== 'boolean') {
        throw createFailError(`${chalk.white.bgRed(' TELEMETRY ERROR ')} --fix can't have a value`);
      }

      if (typeof path === 'boolean') {
        throw createFailError(`${chalk.white.bgRed(' TELEMETRY ERROR ')} --path require a value`);
      }

      if (fix && typeof path !== 'undefined') {
        throw createFailError(
          `${chalk.white.bgRed(' TELEMETRY ERROR ')} --fix is incompatible with --path flag.`
        );
      }

      if (fix && typeof ignoreStoredJson !== 'undefined') {
        throw createFailError(
          `${chalk.white.bgRed(
            ' TELEMETRY ERROR '
          )} --fix is incompatible with --ignore-stored-json flag.`
        );
      }

      const list = new Listr([
        {
          title: 'Checking .telemetryrc.json files',
          task: () => new Listr(parseConfigsTask(), { exitOnError: true }),
        },
        {
          title: 'Extracting Collectors',
          task: (context) => new Listr(extractCollectorsTask(context, path), { exitOnError: true }),
        },
        {
          enabled: () => typeof path !== 'undefined',
          title: 'Checking collectors in --path are not excluded',
          task: ({ roots }: TaskContext) => {
            const totalCollections = roots.reduce((acc, root) => {
              return acc + (root.parsedCollections?.length || 0);
            }, 0);
            const collectorsInPath = Array.isArray(path) ? path.length : 1;

            if (totalCollections !== collectorsInPath) {
              throw new Error(
                'Collector specified in `path` is excluded; Check the telemetryrc.json files.'
              );
            }
          },
        },
        {
          title: 'Checking Compatible collector.schema with collector.fetch type',
          task: (context) => new Listr(checkCompatibleTypesTask(context), { exitOnError: true }),
        },
        {
          enabled: (_) => fix || !ignoreStoredJson,
          title: 'Checking Matching collector.schema against stored json files',
          task: (context) =>
            new Listr(checkMatchingSchemasTask(context, !fix), { exitOnError: true }),
        },
        {
          enabled: (_) => fix,
          skip: ({ roots }: TaskContext) => {
            const noDiffs = roots.every(
              ({ esMappingDiffs }) => !esMappingDiffs || !esMappingDiffs.length
            );
            return noDiffs && 'No changes needed.';
          },
          title: 'Generating new telemetry mappings',
          task: (context) => new Listr(generateSchemasTask(context), { exitOnError: true }),
        },
        {
          enabled: (_) => fix,
          skip: ({ roots }: TaskContext) => {
            const noDiffs = roots.every(
              ({ esMappingDiffs }) => !esMappingDiffs || !esMappingDiffs.length
            );
            return noDiffs && 'No changes needed.';
          },
          title: 'Updating telemetry mapping files',
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
}
