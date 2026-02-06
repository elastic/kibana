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
import {
  detectConflictsWithRemovedTypes,
  detectNewRemovedTypes,
  getRemovedTypes,
  updateRemovedTypes,
} from '../../migrations/removed_types';

export const checkRemovedTypes: Task = async (ctx, task) => {
  const subtasks: ListrTask<TaskContext>[] = [
    {
      title: 'Detecting conflicts with removed types',
      task: async () => {
        ctx.currentRemovedTypes = await getRemovedTypes();
        await detectConflictsWithRemovedTypes(ctx.to!, ctx.currentRemovedTypes);
      },
    },
    {
      title: `Detecting new removed types`,
      task: () => {
        ctx.newRemovedTypes = detectNewRemovedTypes(ctx.from!, ctx.to!, ctx.currentRemovedTypes);
      },
    },
    {
      title: `Updating removed types`,
      task: async () => {
        await updateRemovedTypes(ctx.newRemovedTypes, ctx.currentRemovedTypes, ctx.fix);
      },
      skip: () => ctx.newRemovedTypes.length === 0,
    },
  ];

  return task.newListr<TaskContext>(subtasks);
};
