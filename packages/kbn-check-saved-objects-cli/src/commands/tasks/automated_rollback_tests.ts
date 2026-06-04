/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ListrTask } from 'listr2';
import type { MigrationAlgorithm, Task, TaskContext } from '../types';
import { createBaseline } from './create_baseline';
import { testUpgrade } from './test_upgrade';
import { testRollback } from './test_rollback';
import { extractMappingsFromSnapshot } from '../../snapshots';

const rollbackTestsForAlgorithm = (algorithm: MigrationAlgorithm): ListrTask<TaskContext> => ({
  title: `Rollback tests (${algorithm})`,
  task: (ctx, task) => {
    ctx.migrationAlgorithm = algorithm;
    ctx.migrationKibanaIndex = `.kibana_migrator_${algorithm}_${Date.now()}`;

    ctx.migrationTypes = ctx.typesWithNewModelVersions.map((type) => ({
      ...type,
      indexPattern: ctx.migrationKibanaIndex,
    }));

    return task.newListr<TaskContext>([
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
    ]);
  },
});

export const automatedRollbackTests: Task = (ctx, task) => {
  const subtasks: ListrTask<TaskContext>[] = [
    {
      title: 'Extract baseline mappings from snapshot',
      task: () => {
        ctx.baselineMappings = extractMappingsFromSnapshot(ctx.from!);
      },
    },
    ...ctx.migrationAlgorithms.map(rollbackTestsForAlgorithm),
  ];

  return task.newListr<TaskContext>(subtasks);
};
