/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ListrTask } from 'listr2';
import { Listr } from 'listr2';
import { run } from '@kbn/dev-cli-runner';
import type { MigrationSnapshot, ServerHandles } from '../types';
import { startServers, stopServers } from '../util/servers';
import { fetchSnapshot, getUpdatedTypes, takeSnapshot, validateChanges } from '../snapshots';
import { getLatestTypeFixtures } from '../migrations/fixtures';
import type { FixtureTemplate } from '../migrations/fixtures';

interface TaskContext {
  serverHandles?: ServerHandles;
  from?: MigrationSnapshot;
  to?: MigrationSnapshot;
  updatedTypes: string[];
  fixtures: Record<
    string,
    {
      previous: FixtureTemplate[];
      current: FixtureTemplate[];
    }
  >;
}

export function runCheckSavedObjectsCli() {
  let globalTask: Listr<TaskContext, 'default', 'simple'>;

  run(
    async ({ log, flagsReader }) => {
      let exitCode = 0;
      const gitRev = flagsReader.string('gitRev');
      const fix = flagsReader.boolean('fix');
      const context: TaskContext = {
        updatedTypes: [],
        fixtures: {},
      };

      if (!gitRev) {
        throw new Error(
          'No baseline SHA provided, cannot check changes in Saved Objects. Please provide a --baseline <gitRev>'
        );
      }

      globalTask = new Listr(
        [
          {
            title: 'Starting ES + Kibana',
            task: async (ctx) => {
              ctx.serverHandles = await startServers();
            },
          },
          {
            title: 'Obtaining SO type registry snapshots',
            task: async (ctx, task) => {
              const subtasks: ListrTask<TaskContext>[] = [
                {
                  title: `Obtanining snapshot for baseline '${gitRev}'`,
                  task: async () => {
                    ctx.from = await fetchSnapshot(gitRev);
                  },
                  retry: {
                    delay: 2000,
                    tries: 5,
                  },
                },
                {
                  title: `Taking snapshot of current SO type definitions`,
                  task: async () => {
                    ctx.to = await takeSnapshot(ctx.serverHandles!);
                  },
                },
              ];

              return task.newListr<TaskContext>(subtasks, { concurrent: true });
            },
          },
          {
            title: 'Detecting updated types',
            task: (ctx) => {
              ctx.updatedTypes = getUpdatedTypes({ from: ctx.from!, to: ctx.to! });
            },
          },
          {
            title: 'Validating changes in updated types',
            task: (ctx, task) => {
              const subtasks: ListrTask<TaskContext>[] = ctx.updatedTypes.map((name) => ({
                title: `Checking updates on type '${name}'`,
                task: () =>
                  validateChanges({
                    from: ctx.from?.typeDefinitions[name],
                    to: ctx.to?.typeDefinitions[name]!,
                  }),
              }));

              return task.newListr<TaskContext>(subtasks, { exitOnError: false });
            },
            skip: (ctx) => ctx.updatedTypes.length === 0,
          },
          {
            title: 'Checking for SO fixtures',
            task: (ctx, task) => {
              const registry = ctx.serverHandles?.coreStart.savedObjects.getTypeRegistry();
              const subtasks: ListrTask<TaskContext>[] = ctx.updatedTypes.map((type) => {
                return {
                  title: `Loading fixtures for type '${type}'`,
                  task: async () => {
                    const typeFixtures = await getLatestTypeFixtures({
                      type: registry?.getType(type)!,
                      snapshot: ctx.to!,
                      fix,
                    });
                    ctx.fixtures[type] = typeFixtures;
                  },
                };
              });
              return task.newListr<TaskContext>(subtasks, { exitOnError: false });
            },
            skip: (ctx) => ctx.updatedTypes.length === 0,
          },
          {
            title: 'Automated rollback tests',
            task: () => {},
            skip: () => globalTask.errors.length > 0,
          },
        ],
        {
          fallbackRenderer: 'simple',
          collectErrors: 'minimal',
          exitOnError: true,
          concurrent: false,
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
              title: 'Stopping Kibana + ES',
              task: async (ctx) => {
                await stopServers(ctx.serverHandles!);
              },
              skip: (ctx) => !ctx.serverHandles,
              exitOnError: false,
            },
          ],
          { fallbackRenderer: 'simple' }
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
