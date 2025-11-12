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
import { startServers, stopServers } from '../util/servers';
import type { TaskContext } from './types';
import {
  automatedRollbackTests,
  getSnapshots,
  validateNewTypes,
  validateUpdatedTypes,
} from './tasks';

export function runCheckSavedObjectsCli() {
  let globalTask: Listr<TaskContext, 'default', 'simple'>;

  run(
    async ({ log, flagsReader }) => {
      let exitCode = 0;
      const gitRev = flagsReader.string('gitRev');
      const fix = flagsReader.boolean('fix');

      if (!gitRev) {
        throw new Error(
          'No baseline SHA provided, cannot check changes in Saved Objects. Please provide a --baseline <gitRev>'
        );
      }

      const context: TaskContext = {
        gitRev,
        newTypes: [],
        updatedTypes: [],
        fixtures: {},
        fix,
      };

      globalTask = new Listr(
        [
          {
            title: 'Start ES + Kibana',
            task: async (ctx) => (ctx.serverHandles = await startServers()),
          },
          {
            title: 'Get type registry snapshots',
            task: getSnapshots,
          },
          {
            title: 'Validate new SO types',
            task: validateNewTypes,
          },
          {
            title: 'Validate existing SO types',
            task: validateUpdatedTypes,
          },
          {
            title: 'Automated rollback tests',
            task: automatedRollbackTests,
            skip: (ctx) => ctx.updatedTypes.length === 0 || globalTask.errors.length > 0,
          },
        ],
        {
          collectErrors: 'minimal',
          concurrent: false,
          exitOnError: true,
          fallbackRenderer: 'simple',
          rendererOptions: {
            collapseSubtasks: false,
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
              title: 'Stop Kibana + ES',
              task: async (ctx) => {
                await stopServers(ctx.serverHandles!);
              },
              skip: (ctx) => !ctx.serverHandles,
            },
          ],
          { fallbackRenderer: 'simple', exitOnError: false }
        ).run(context);
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
        boolean: ['fix'],
        string: ['gitRev'],
        default: {
          verify: true,
          mappings: true,
        },
        help: `
        --baseline <SHA>   Provide a commit SHA, to use as a baseline for comparing SO changes against
        --fix              Generate templates for missing fixture files, and update outdated JSON files
      `,
      },
    }
  );
}
