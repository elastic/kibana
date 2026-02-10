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
import { TEST_TYPES, getTestSnapshots } from '../test';
import { validateSOChanges } from './validate_so_changes';

export const validateTestFlow: Task = (ctx, task) => {
  const subtasks: ListrTask<TaskContext>[] = [
    {
      title: 'Obtain type registry (test mode)',
      task: async () => {
        ctx.registeredTypes = TEST_TYPES;
      },
    },
    {
      title: 'Get type registry snapshots (test mode)',
      task: getTestSnapshots,
    },
    {
      title: 'Validate SO changes',
      task: validateSOChanges,
    },
  ];

  return task.newListr<TaskContext>(subtasks);
};
