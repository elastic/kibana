/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ListrTask } from 'listr2';
import type { Task, TaskContext } from '../types';
import { getUpdatedTypes, validateChanges } from '../../snapshots';
import { getLatestTypeFixtures } from '../../migrations/fixtures';

export const validateUpdatedTypes: Task = (ctx, task) => {
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
        const validateChangesTasks: ListrTask<TaskContext>[] = ctx.updatedTypes.map((name) => ({
          title: `Checking updates on type '${name}'`,
          task: () =>
            validateChanges({
              from: ctx.from?.typeDefinitions[name],
              to: ctx.to?.typeDefinitions[name]!,
            }),
        }));

        return subtask.newListr<TaskContext>(validateChangesTasks, {
          exitOnError: false,
        });
      },
      skip: () => ctx.updatedTypes.length === 0,
    },
    {
      title: 'Verifying fixtures for updated types',
      task: (_, subtask) => {
        const registry = ctx.serverHandles!.typeRegistry;
        const fixturesTasks: ListrTask<TaskContext>[] = ctx.updatedTypes.map((type) => {
          return {
            title: `Loading fixtures for type '${type}'`,
            task: async () => {
              const typeFixtures = await getLatestTypeFixtures({
                type: registry?.getType(type)!,
                snapshot: ctx.to!,
                fix: ctx.fix,
              });
              ctx.fixtures[type] = typeFixtures;
            },
          };
        });
        return subtask.newListr<TaskContext>(fixturesTasks, { exitOnError: false });
      },
      skip: () => ctx.updatedTypes.length === 0,
    },
  ];
  return task.newListr<TaskContext>(subtasks);
};
