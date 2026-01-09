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
import { getNewTypes, validateChangesNewType } from '../../snapshots';

export const validateNewTypes: Task = (ctx, task) => {
  const newTypes = getNewTypes({ from: ctx.from!, to: ctx.to! });
  const subtasks: ListrTask<TaskContext>[] = [
    {
      title: 'Checking new types',
      task: (_, checkNew) => {
        const checkNewTasks: ListrTask<TaskContext>[] = newTypes.map((name) => ({
          title: `Checking '${name}'`,
          task: () => validateChangesNewType({ to: ctx.to?.typeDefinitions[name]! }),
        }));

        return checkNew.newListr<TaskContext>(checkNewTasks, {
          exitOnError: false,
          rendererOptions: { showErrorMessage: true },
        });
      },
      skip: () => newTypes.length === 0,
    },
  ];
  return task.newListr<TaskContext>(subtasks);
};
