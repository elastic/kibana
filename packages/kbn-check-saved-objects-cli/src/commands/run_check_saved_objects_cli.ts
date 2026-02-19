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
import { setupKibana, startElasticsearch, stopElasticsearch, stopKibana } from '../util';
import type { TaskContext } from './types';
import {
  automatedRollbackTests,
  checkRemovedTypes,
  getSnapshots,
  validateNewTypes,
  validateUpdatedTypes,
} from './tasks';
import { getTestSnapshots, TEST_TYPES } from './test';

export function runCheckSavedObjectsCli() {
  let globalTask: Listr<TaskContext, 'default', 'simple'>;

  run(
    async ({ log, flagsReader }) => {
      let exitCode = 0;
      const gitRev = flagsReader.string('gitRev');
      const fix = flagsReader.boolean('fix');
      const server = flagsReader.boolean('server');
      const client = flagsReader.boolean('client');
      const test = flagsReader.boolean('test');

      if (!server && !test && !gitRev) {
        throw new Error(
          'No baseline SHA provided, cannot check changes in Saved Objects. Please provide a --baseline <gitRev>'
        );
      }

      const context: TaskContext = {
        gitRev: gitRev!,
        updatedTypes: [],
        currentRemovedTypes: [],
        newRemovedTypes: [],
        fixtures: {
          previous: {},
          current: {},
        },
        test,
        fix,
      };

      globalTask = new Listr(
        [
          {
            title: 'Start ES',
            task: async (ctx) => (ctx.esServer = await startElasticsearch()),
            enabled: !client, // we skip this step if '--client' is passed
          },
          {
            title: `Wait for ES startup`,
            task: async (ctx, task) =>
              await new Promise(
                () => (task.title = `Running on ${ctx.esServer!.hosts}. Press Ctrl+C to stop`)
              ),
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
            title: 'Start Kibana to obtain type registry',
            task: async (ctx) => {
              ctx.kibanaServer = await setupKibana();
              const coreStart = await ctx.kibanaServer.start();
              ctx.registeredTypes = coreStart!.savedObjects.getTypeRegistry().getAllTypes();
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
           * The following tasks only run in "--test mode".
           *
           * Instead of starting Kibana and getting the actual typeRegistry
           * we use a test registry with a bunch of fake SO types.
           * ==================================================================
           */
          {
            title: 'Obtain type registry (test mode)',
            task: async (ctx) => (ctx.registeredTypes = TEST_TYPES),
            enabled: !server && test,
          },
          {
            title: 'Get type registry snapshots (test mode)',
            task: getTestSnapshots,
            enabled: !server && test,
          },
          /**
           * ==================================================================
           * The following tasks run systematically
           * ==================================================================
           */
          {
            title: 'Check removed SO types',
            task: checkRemovedTypes,
            enabled: !server,
          },
          {
            title: 'Validate new SO types',
            task: validateNewTypes,
            enabled: !server,
          },
          {
            title: 'Validate existing SO types',
            task: validateUpdatedTypes,
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
              title: 'Stop Kibana',
              task: async (ctx) => await stopKibana(ctx.kibanaServer!),
              enabled: (ctx) => Boolean(ctx.kibanaServer),
            },
            {
              title: 'Stop ES',
              task: async (ctx) => await stopElasticsearch(ctx.esServer!),
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

      Usage: node scripts/check_saved_objects --baseline <gitRev> --fix
    `,
      flags: {
        alias: {
          baseline: 'gitRev',
        },
        boolean: ['fix', 'server', 'client', 'test'],
        string: ['gitRev'],
        default: {
          verify: true,
          mappings: true,
        },
        help: `
        --baseline <SHA>   Provide a commit SHA, to use as a baseline for comparing SO changes against
        --fix              Generate templates for missing fixture files, and update outdated JSON files
        --server           Start ES in order to repeatedly execute the 'check_saved_objects' script
        --client           Do not start ES server (requires running the command above on a separate term)
        --test             Use a sample type registry with dummy types and hardcoded snapshots (no longer starts Kibana)
      `,
      },
    }
  );
}
