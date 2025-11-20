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
import { getNewTypes, validateChanges } from '../../snapshots';

export const validateNewTypes: Task = (ctx, task) => {
  const subtasks: ListrTask<TaskContext>[] = [
    {
      title: 'Detecting new types',
      task: () => {
        ctx.newTypes = getNewTypes({ from: ctx.from!, to: ctx.to! });
      },
    },
    {
      title: 'Checking new types',
      task: (_, checkNew) => {
        const checkNewTasks: ListrTask<TaskContext>[] = ctx.newTypes.map((name) => ({
          title: `Checking '${name}'`,
          task: () =>
            validateChanges({
              from: ctx.from?.typeDefinitions[name],
              to: ctx.to?.typeDefinitions[name]!,
            }),
        }));

        return checkNew.newListr<TaskContext>(checkNewTasks, { exitOnError: false });
      },
      skip: () => ctx.newTypes.length === 0,
    },
  ];
  return task.newListr<TaskContext>(subtasks);
};
