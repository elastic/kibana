/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Listr } from 'listr2';
import chalk from 'chalk';
import { createFailError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';

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

      const list = new Listr<TaskContext>(
        [
          {
            title: 'Checking .telemetryrc.json files',
            task: (context, task) => task.newListr(parseConfigsTask(), { exitOnError: true }),
          },
          {
            title: 'Extracting Collectors',
            task: (context, task) =>
              task.newListr(extractCollectorsTask(context, path), { exitOnError: true }),
          },
          {
            enabled: () => typeof path !== 'undefined',
            title: 'Checking collectors in --path are not excluded',
            task: (context) => {
              const totalCollections = context.roots.reduce((acc, root) => {
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
            task: (context, task) =>
              task.newListr(checkCompatibleTypesTask(context), { exitOnError: true }),
          },
          {
            enabled: (_) => fix || !ignoreStoredJson,
            title: 'Checking Matching collector.schema against stored json files',
            task: (context, task) =>
              task.newListr(checkMatchingSchemasTask(context, !fix), { exitOnError: true }),
          },
          {
            enabled: (_) => fix,
            skip: (context) => {
              const noDiffs = context.roots.every(
                ({ esMappingDiffs }) => !esMappingDiffs || !esMappingDiffs.length
              );
              return noDiffs && 'No changes needed.';
            },
            title: 'Generating new telemetry mappings',
            task: (context, task) =>
              task.newListr(generateSchemasTask(context), { exitOnError: true }),
          },
          {
            enabled: (_) => fix,
            skip: (context) => {
              const noDiffs = context.roots.every(
                ({ esMappingDiffs }) => !esMappingDiffs || !esMappingDiffs.length
              );
              return noDiffs && 'No changes needed.';
            },
            title: 'Updating telemetry mapping files',
            task: (context, task) => task.newListr(writeToFileTask(context), { exitOnError: true }),
          },
        ],
        {
          renderer: process.env.CI ? 'verbose' : ('default' as any),
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
