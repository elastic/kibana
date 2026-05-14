/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import type { ListrTask } from 'listr2';
import type { Task, TaskContext } from '../types';
import { checkRemovedTypes } from './check_removed_types';
import { validateNewTypes } from './validate_new_types';
import { validateUpdatedTypes } from './validate_updated_types';
import { WIP_TYPES_JSON_PATH } from '../../migrations/removed_types/constants';

export const validateSOChanges: Task = (ctx, task) => {
  const subtasks: ListrTask<TaskContext>[] = [
    {
      title: 'Load WIP SO types',
      task: () => {
        ctx.wipTypes = JSON.parse(readFileSync(WIP_TYPES_JSON_PATH, 'utf-8')) as string[];

        for (const wipType of ctx.wipTypes) {
          delete ctx.from?.typeDefinitions[wipType];
          delete ctx.serverlessFrom?.typeDefinitions[wipType];
        }
      },
    },
    {
      title: 'Check removed SO types',
      task: checkRemovedTypes,
    },
    {
      title: 'Validate new SO types',
      task: validateNewTypes,
    },
    {
      title: 'Validate existing SO types',
      task: validateUpdatedTypes,
    },
  ];

  return task.newListr<TaskContext>(subtasks);
};
