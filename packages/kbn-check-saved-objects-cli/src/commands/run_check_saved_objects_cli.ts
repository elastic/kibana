/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Listr, PRESET_TIMER } from 'listr2';
import { run } from '@kbn/dev-cli-runner';
import { getKibanaServer, startElasticsearch, stopElasticsearch } from '../util';
import type { MigrationAlgorithm, TaskContext } from './types';
import { automatedRollbackTests, getSnapshots, validateSOChanges, validateTestFlow } from './tasks';

export function runCheckSavedObjectsCli() {
  let globalTask: Listr<TaskContext, 'default', 'simple'>;

  run(
    async ({ log, flagsReader }) => {
      let exitCode = 0;
      const gitRev = flagsReader.string('gitRev');
      const serverlessGitRev = flagsReader.string('serverlessGitRev');
      const fix = flagsReader.boolean('fix');
      const server = flagsReader.boolean('server');
      const client = flagsReader.boolean('client');
      const test = flagsReader.boolean('test');
      const algorithmFlag = flagsReader.string('algorithm') ?? 'v2';

      let migrationAlgorithms: MigrationAlgorithm[];
      if (algorithmFlag === 'both') {
        migrationAlgorithms = ['v2', 'zdt'];
      } else if (['v2', 'zdt'].includes(algorithmFlag)) {
        migrationAlgorithms = [algorithmFlag as MigrationAlgorithm];
      } else {
        throw new Error(
          `Invalid --algorithm value '${algorithmFlag}'. Must be one of: v2, zdt, both`
        );
      }

      if (!server && !test && !gitRev) {
        throw new Error(
          'No baseline SHA provided, cannot check changes in Saved Objects. Please provide a --baseline <gitRev>'
        );
      }

      const context: TaskContext = {
        gitRev: gitRev!,
        serverlessGitRev,
        updatedTypes: [],
        wipTypes: [],
        currentRemovedTypes: [],
        newRemovedTypes: [],
        fixtures: {
          previous: {},
          current: {},
        },
        test,
        fix,
        migrationAlgorithms,
      };

      globalTask = new Listr(
        [
          {
            title: 'Start ES',
            // we launch the ES server in the background and store a promise that resolves when the server is ready
            task: (ctx) => (ctx.esServer = startElasticsearch()),
            enabled: !client, // we skip this step if '--client' is passed
          },
          {
            title: `Wait for ES startup`,
            task: async (ctx, task) => {
              const esServer = await ctx.esServer!;
              await new Promise(
                () => (task.title = `Running on ${esServer.hosts}. Press Ctrl+C to stop`)
              );
            },
            enabled: (ctx) => server && Boolean(ctx.esServer),
          },
          /**
           * ==================================================================
           * The following tasks only run in normal mode (no "--test")
           *
           * We start Kibana and initialise all plugins so that ALL SO types
           * are registered and we can obtain a real snapshot
           * ==================================================================
           */
          {
            title: 'Setup Kibana to obtain type registry',
            task: async (ctx) => {
              ctx.kibanaServer = await getKibanaServer();
              await ctx.kibanaServer.preboot();
              const coreSetup = await ctx.kibanaServer.setup();
              ctx.registeredTypes = coreSetup!.savedObjects.getTypeRegistry().getAllTypes();
              ctx.encryptedSavedObjects = coreSetup._plugins?.get('encryptedSavedObjects');
            },
            enabled: !server && !test,
          },
          {
            title: 'Get type registry snapshots',
            task: getSnapshots,
            enabled: !server && !test,
          },
          /**
           * ==================================================================
           * Validate SO changes.
           *
           * Checks for removed types, new types, and updated types.
           * ==================================================================
           */
          {
            title: 'Validate SO changes',
            task: validateSOChanges,
            enabled: !server && !test,
          },
          {
            title: 'Fallback to test mode (no updated types detected)',
            task: (ctx) => {
              ctx.test = true;
            },
            enabled: !server && !test,
            skip: (ctx) => ctx.updatedTypes.length > 0,
          },
          /**
           * ==================================================================
           * Validate test flow (runs in test mode or after fallback).
           *
           * Sets up a test type registry and test snapshots, then runs
           * the same validation pipeline with test data.
           * ==================================================================
           */
          {
            title: 'Validate test flow',
            task: validateTestFlow,
            enabled: !server,
            skip: (ctx) => !ctx.test,
          },
          {
            title: 'Wait for ES startup',
            task: async (ctx) => await ctx.esServer,
            enabled: !server,
          },
          {
            title: 'Automated rollback tests',
            task: automatedRollbackTests,
            skip: (ctx) => ctx.updatedTypes.length === 0 || globalTask.errors.length > 0,
            enabled: !server,
          },
        ],
        {
          collectErrors: 'minimal',
          concurrent: false,
          exitOnError: true,
          fallbackRenderer: 'simple',
          rendererOptions: {
            collapseSubtasks: false,
            showErrorMessage: false,
            timer: PRESET_TIMER,
          },
        }
      );

      try {
        await globalTask.run(context);
        exitCode = globalTask.errors.length > 0 ? 1 : 0;
      } catch (err) {
        log.error(err);
        exitCode = 1;
      } finally {
        await new Listr<TaskContext, 'default', 'simple'>(
          [
            {
              title: 'Stop ES',
              task: async (ctx) => await stopElasticsearch(await ctx.esServer!),
              enabled: (ctx) => Boolean(ctx.esServer),
            },
          ],
          { fallbackRenderer: 'simple', exitOnError: false }
        ).run(context);
      }
      if (exitCode) {
        log.warning(
          'Validation Failed. Please refer to our troubleshooting guide for more information: https://www.elastic.co/docs/extend/kibana/saved-objects/validate#troubleshooting'
        );
      }
      process.exit(exitCode);
    },
    {
      description: `
      Determine if the changes performed to the Saved Objects mappings are following our standards.

      Usage: node scripts/check_saved_objects --baseline <gitRev> [--algorithm <v2|zdt|both>] --fix
    `,
      flags: {
        alias: {
          baseline: 'gitRev',
          'serverless-baseline': 'serverlessGitRev',
        },
        boolean: ['fix', 'server', 'client', 'test'],
        string: ['gitRev', 'serverlessGitRev', 'algorithm'],
        default: {
          verify: true,
          mappings: true,
        },
        help: `
        --baseline <SHA>   Provide a commit SHA, to use as a baseline for comparing SO changes against
        --serverless-baseline <SHA>  Optional commit SHA for current Serverless release baseline
        --fix              Generate templates for missing fixture files, and update outdated JSON files
        --server           Start ES in order to repeatedly execute the 'check_saved_objects' script
        --client           Do not start ES server (requires running the command above on a separate term)
        --test             Use a sample type registry with dummy types and hardcoded snapshots (no longer starts Kibana)
        --algorithm <v2|zdt|both>  Migration algorithm to use for rollback tests (default: v2)
      `,
      },
    }
  );
}
