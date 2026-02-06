/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ListrTask } from 'listr2';
import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';
import type { Task, TaskContext } from '../types';
import { createBaseline } from './create_baseline';
import { testUpgrade } from './test_upgrade';
import { testRollback } from './test_rollback';
import { fileToJson, getFileFromKibanaRepo } from '../../util';
import { BASELINE_MAPPINGS_TEST } from '../test';

export const automatedRollbackTests: Task = (ctx, task) => {
  const subtasks: ListrTask<TaskContext>[] = [
    {
      title: 'Fetch baseline mappings',
      task: async () =>
        (ctx.baselineMappings = await getFileFromKibanaRepo({
          path: 'packages/kbn-check-saved-objects-cli/current_mappings.json',
          ref: ctx.gitRev,
        })),
      retry: { tries: 5, delay: 2_000 },
      enabled: () => !ctx.test,
    },
    {
      title: 'Fetch baseline mappings (test mode)',
      task: async () =>
        (ctx.baselineMappings = (await fileToJson(
          BASELINE_MAPPINGS_TEST
        )) as SavedObjectsTypeMappingDefinitions),
      enabled: () => ctx.test,
    },
    {
      title: 'Create baseline',
      task: createBaseline,
    },
    {
      title: 'Upgrade',
      task: testUpgrade,
    },
    {
      title: 'Rollback',
      task: testRollback,
    },
    {
      title: 'Re-run upgrade',
      task: testUpgrade,
    },
  ];

  return task.newListr<TaskContext>(subtasks);
};
