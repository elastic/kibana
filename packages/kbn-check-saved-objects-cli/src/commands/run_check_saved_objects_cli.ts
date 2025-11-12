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
import {
  fetchSnapshot,
  getNewTypes,
  getUpdatedTypes,
  takeSnapshot,
  validateChanges,
} from '../snapshots';
import { getLatestTypeFixtures } from '../migrations/fixtures';
import type { FixtureTemplate } from '../migrations/fixtures';

interface TaskContext {
  serverHandles?: ServerHandles;
  from?: MigrationSnapshot;
  to?: MigrationSnapshot;
  newTypes: string[];
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
        newTypes: [],
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
            title: 'Start ES + Kibana',
            task: async (ctx) => {
              ctx.serverHandles = await startServers();
            },
          },
          {
            title: 'Get type registry snapshots',
            task: async (ctx, task) => {
              const subtasks: ListrTask<TaskContext>[] = [
                {
                  title: `Obtain snapshot for baseline '${gitRev}'`,
                  task: async () => {
                    ctx.from = await fetchSnapshot(gitRev);
                  },
                  retry: {
                    delay: 2000,
                    tries: 5,
                  },
                },
                {
                  title: `Take snapshot of current SO type definitions`,
                  task: async () => {
                    ctx.to = await takeSnapshot(ctx.serverHandles!);
                  },
                },
              ];

              return task.newListr<TaskContext>(subtasks, { concurrent: true });
            },
          },
          {
            title: 'Validate new SO types',
            task: (ctx, task) => {
              const subtasks: ListrTask<TaskContext>[] = [
                {
                  title: 'Detecting new types',
                  task: () => {
                    ctx.newTypes = getNewTypes({ from: ctx.from!, to: ctx.to! });
                  },
                },
                {
                  title: 'Checking new types',
                  task: (_, subtask) => {
                    const subsubtasks: ListrTask<TaskContext>[] = ctx.newTypes.map((name) => ({
                      title: `Checking '${name}'`,
                      task: () =>
                        validateChanges({
                          from: ctx.from?.typeDefinitions[name],
                          to: ctx.to?.typeDefinitions[name]!,
                        }),
                    }));

                    return subtask.newListr<TaskContext>(subsubtasks, { exitOnError: false });
                  },
                  skip: () => ctx.newTypes.length === 0,
                },
              ];
              return task.newListr<TaskContext>(subtasks);
            },
          },
          {
            title: 'Validate existing SO types',
            task: (ctx, task) => {
              const subtasks: ListrTask<TaskContext>[] = [
                {
                  title: 'Detecting updated types',
                  task: () => {
                    ctx.updatedTypes = getUpdatedTypes({ from: ctx.from!, to: ctx.to! });
                  },
                },
                {
                  title: 'Validating changes in updated types',
                  task: (_, subtask) => {
                    const subsubtasks: ListrTask<TaskContext>[] = ctx.updatedTypes.map((name) => ({
                      title: `Checking updates on type '${name}'`,
                      task: () =>
                        validateChanges({
                          from: ctx.from?.typeDefinitions[name],
                          to: ctx.to?.typeDefinitions[name]!,
                        }),
                    }));

                    return subtask.newListr<TaskContext>(subsubtasks, { exitOnError: false });
                  },
                  skip: () => ctx.updatedTypes.length === 0,
                },
                {
                  title: 'Verifying fixtures for updated types',
                  task: (_, subtask) => {
                    const registry = ctx.serverHandles?.coreStart.savedObjects.getTypeRegistry();
                    const subsubtasks: ListrTask<TaskContext>[] = ctx.updatedTypes.map((type) => {
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
                    return subtask.newListr<TaskContext>(subsubtasks, { exitOnError: false });
                  },
                  skip: () => ctx.updatedTypes.length === 0,
                },
                {
                  title: 'Automated rollback tests',
                  task: () => {},
                  skip: () => ctx.updatedTypes.length === 0 || globalTask.errors.length > 0,
                },
              ];
              return task.newListr<TaskContext>(subtasks);
            },
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
