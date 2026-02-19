/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ListrTask } from 'listr2';
import { getKibanaMigratorTestKit } from '@kbn/migrator-test-kit';
import type { Task, TaskContext } from '../types';
import { getPreviousVersionType } from '../../migrations';
import { checkDocuments } from './check_documents';

export const testRollback: Task = async (ctx, task) => {
  const { updatedTypes, baselineMappings } = ctx;

  const previousVersionTypes = updatedTypes.map((type) =>
    getPreviousVersionType({ type, previousMappings: baselineMappings! })
  );

  const { runMigrations: performRollback, savedObjectsRepository } = await getKibanaMigratorTestKit(
    { types: previousVersionTypes }
  );

  const subtasks: ListrTask<TaskContext>[] = [
    {
      title: `Run rollback migration on updated types: '${updatedTypes
        .map(({ name }) => name)
        .join(', ')}'`,
      task: async () => await performRollback(),
    },
    {
      title: `Ensure API-retrieved SOs match previous version fixtures`,
      task: checkDocuments({
        repository: savedObjectsRepository,
        types: previousVersionTypes,
        fixtures: ctx.fixtures.previous,
      }),
    },
  ];
  return task.newListr<TaskContext>(subtasks);
};
