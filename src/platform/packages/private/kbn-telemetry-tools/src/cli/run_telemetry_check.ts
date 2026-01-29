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

import { validateSchemaChanges } from '../tools/tasks/validate_schema_changes';
import type { TaskContext } from '../tools/tasks';
import {
  createTaskContext,
  ErrorReporter,
  parseConfigsTask,
  extractCollectorsTask,
  checkMatchingSchemasTask,
  generateSchemasTask,
  checkCompatibleTypesTask,
  writeToFileTask,
} from '../tools/tasks';

// Patterns that indicate telemetry collector files
const COLLECTOR_PATTERNS = [
  'collectors/',
  '_collector',
  'usage_collector',
  'telemetry_collector',
  '/server/telemetry/',
  '/server/usage/',
  '.telemetryrc.json',
];

/**
 * Check if any of the provided files are telemetry-related.
 * If files are provided and none match collector patterns, we can skip the check.
 */
function shouldSkipTelemetryCheck(files: string[] | undefined): boolean {
  if (!files || files.length === 0) {
    return false; // No file filter, run the check
  }

  // Check if any file matches collector patterns
  for (const file of files) {
    for (const pattern of COLLECTOR_PATTERNS) {
      if (file.includes(pattern)) {
        return false; // Found a telemetry-related file, run the check
      }
    }
  }

  return true; // No telemetry files found, skip
}

/**
 * Map package paths to telemetry roots.
 * e.g., "x-pack/solutions/observability/plugins/foo" -> "x-pack/solutions/observability"
 */
function mapPackagesToRoots(packages: string[]): string[] {
  const roots = new Set<string>();

  for (const pkg of packages) {
    let root: string;

    if (pkg.startsWith('x-pack/solutions/')) {
      // Extract solution name: x-pack/solutions/observability/... -> x-pack/solutions/observability
      const parts = pkg.split('/');
      root = parts.slice(0, 3).join('/');
    } else if (pkg.startsWith('x-pack/platform/')) {
      root = 'x-pack/platform';
    } else if (pkg.startsWith('x-pack/')) {
      root = 'x-pack/plugins';
    } else if (pkg.startsWith('src/platform/')) {
      root = 'src/platform';
    } else if (pkg.startsWith('src/plugins/')) {
      root = 'src/plugins';
    } else if (pkg.startsWith('packages/')) {
      root = 'packages';
    } else {
      root = pkg;
    }

    roots.add(root);
  }

  return Array.from(roots);
}

export function runTelemetryCheck() {
  run(
    async ({
      flags: {
        baselineSha,
        fix,
        'ignore-stored-json': ignoreStoredJson,
        path,
        root,
        files,
        packages,
      },
      log,
    }) => {
      if (typeof baselineSha !== 'undefined' && typeof baselineSha !== 'string') {
        throw createFailError(
          `${chalk.white.bgRed(
            ' TELEMETRY ERROR '
          )} The provided --baseline argument must be a string`
        );
      }
      if (typeof fix !== 'boolean') {
        throw createFailError(`${chalk.white.bgRed(' TELEMETRY ERROR ')} --fix can't have a value`);
      }

      if (typeof path === 'boolean') {
        throw createFailError(`${chalk.white.bgRed(' TELEMETRY ERROR ')} --path require a value`);
      }

      if (typeof root === 'boolean') {
        throw createFailError(`${chalk.white.bgRed(' TELEMETRY ERROR ')} --root requires a value`);
      }

      if (typeof files === 'boolean') {
        throw createFailError(`${chalk.white.bgRed(' TELEMETRY ERROR ')} --files requires a value`);
      }

      if (typeof packages === 'boolean') {
        throw createFailError(
          `${chalk.white.bgRed(' TELEMETRY ERROR ')} --packages requires a value`
        );
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

      // Parse files list for smart-skip check
      const filesString = Array.isArray(files) ? files.join(',') : files;
      const filesList = filesString ? filesString.split(',').filter(Boolean) : undefined;

      // Check if we should skip based on changed files
      if (shouldSkipTelemetryCheck(filesList)) {
        log.success('No telemetry-related files changed. Skipping telemetry check.');
        return;
      }

      // Parse packages and map to roots if provided
      const packagesString = Array.isArray(packages) ? packages.join(',') : packages;
      const packagesList = packagesString ? packagesString.split(',').filter(Boolean) : undefined;
      const packagesRoots = packagesList ? mapPackagesToRoots(packagesList) : undefined;

      // Parse root filter - can be a single string, array of strings, or derived from packages
      let rootFilter: string[] | undefined;
      if (root) {
        rootFilter = Array.isArray(root) ? root : [root];
      } else if (packagesRoots && packagesRoots.length > 0) {
        rootFilter = packagesRoots;
        log.info(`Scoping telemetry check to roots: ${rootFilter.join(', ')}`);
      }

      const list = new Listr<TaskContext>(
        [
          {
            title: 'Checking .telemetryrc.json files',
            task: (context, task) =>
              task.newListr(parseConfigsTask(rootFilter), { exitOnError: true }),
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
              const totalCollections = context.roots.reduce((acc, curr) => {
                return acc + (curr.parsedCollections?.length || 0);
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
          {
            title: 'Validating changes in telemetry schemas',
            task: (context, task) =>
              task.newListr(validateSchemaChanges(context), { exitOnError: true }),
            // only run if on a PR branch
            enabled: (_) => Boolean(baselineSha),
          },
        ],
        {
          renderer: process.env.CI ? 'verbose' : ('default' as any),
        }
      );

      try {
        const context = createTaskContext(baselineSha);
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
        alias: {
          baseline: 'baselineSha',
        },
        boolean: ['fix'],
        string: ['baselineSha', 'root', 'files', 'packages'],
        default: {
          fix: false,
        },
        allowUnexpected: true,
        guessTypesForUnexpectedFlags: true,
        help: `
          --root             Filter to only scan specific roots (can be specified multiple times).
                             Example: --root src/platform --root x-pack/solutions/observability
          --files            Comma-separated list of changed files. If provided and none are
                             telemetry-related, the check is skipped.
          --packages         Comma-separated list of affected packages. Automatically maps to
                             telemetry roots for scoped checking.
        `,
      },
    }
  );
}
