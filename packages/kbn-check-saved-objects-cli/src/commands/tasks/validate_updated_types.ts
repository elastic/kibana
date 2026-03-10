/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ListrTask } from 'listr2';
import { defaultKibanaIndex } from '@kbn/migrator-test-kit';
import type { Task, TaskContext } from '../types';
import { getUpdatedTypes, validateChangesExistingType } from '../../snapshots';
import { getLatestTypeFixtures } from '../../migrations/fixtures';
import { getVersions } from '../../migrations/versions';

export const validateUpdatedTypes: Task = (ctx, task) => {
  const subtasks: ListrTask<TaskContext>[] = [
    {
      title: 'Detecting updated types',
      task: () => {
        const updatedList = getUpdatedTypes({ from: ctx.from!, to: ctx.to! });
        ctx.updatedTypes = ctx
          .registeredTypes!.filter(({ name }) => updatedList.includes(name))
          // we tweak the types to store them all in the `.kibana_migrator` index for our checks
          .map((type) => ({ ...type, indexPattern: defaultKibanaIndex }));
      },
    },
    {
      title: 'Validating changes in updated types',
      task: (_, subtask) => {
        const validateChangesTasks: ListrTask<TaskContext>[] = ctx.updatedTypes.map(({ name }) => ({
          title: `Checking updates on type '${name}'`,
          task: () =>
            validateChangesExistingType({
              from: ctx.from!.typeDefinitions[name],
              to: ctx.to?.typeDefinitions[name]!,
            }),
        }));

        return subtask.newListr<TaskContext>(validateChangesTasks, {
          exitOnError: false,
          rendererOptions: { showErrorMessage: true },
        });
      },
      skip: () => ctx.updatedTypes.length === 0,
    },
    {
      title: 'Verifying fixtures for updated types',
      task: (_, subtask) => {
        const loadFixturesTasks: ListrTask<TaskContext>[] = ctx.updatedTypes.map((type) => {
          const { name } = type;
          return {
            title: `Loading fixtures for type '${name}'`,
            task: async (__, loadFixturesTask) => {
              const [current, previous] = getVersions(ctx.to!.typeDefinitions[name]);
              const typeFixtures = await getLatestTypeFixtures({
                type,
                current,
                previous,
                fix: ctx.fix,
              });
              ctx.fixtures.previous[name] = typeFixtures.previous;
              ctx.fixtures.current[name] = typeFixtures.current;
              loadFixturesTask.title += `: ${typeFixtures.current.relativePath}`;
            },
          };
        });
        return subtask.newListr<TaskContext>(loadFixturesTasks, {
          exitOnError: false,
          rendererOptions: { showErrorMessage: true },
        });
      },
      skip: () => ctx.updatedTypes.length === 0,
    },
  ];
  return task.newListr<TaskContext>(subtasks);
};
