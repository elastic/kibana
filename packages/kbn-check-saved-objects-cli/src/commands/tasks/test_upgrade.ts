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
import { checkDocuments } from './check_documents';

export const testUpgrade: Task = async (ctx, task) => {
  const { migrationTypes, migrationKibanaIndex, migrationAlgorithm } = ctx;
  if (!migrationTypes || !migrationTypes.length) {
    throw new Error('Missing migrationTypes. This task must be run from automated rollback tests.');
  }
  if (!migrationKibanaIndex) {
    throw new Error(
      'Missing migrationKibanaIndex. This task must be run from automated rollback tests.'
    );
  }
  if (!migrationAlgorithm) {
    throw new Error(
      'Missing migrationAlgorithm. This task must be run from automated rollback tests.'
    );
  }

  const { runMigrations, savedObjectsRepository } = await getKibanaMigratorTestKit({
    types: migrationTypes,
    kibanaIndex: migrationKibanaIndex,
    settings: { migrations: { algorithm: migrationAlgorithm } },
    encryptionExtensionFactory: ctx.encryptedSavedObjects
      ? (typeRegistry) => ctx.encryptedSavedObjects!.__testCreateDangerousExtension(typeRegistry)
      : undefined,
  });

  const subtasks: ListrTask<TaskContext>[] = [
    {
      title: `Run migration on updated types: '${migrationTypes
        .map(({ name }) => name)
        .join(', ')}'`,
      task: async () => await runMigrations(),
    },
    {
      title: `Ensure migrated objects match latest version fixtures`,
      task: checkDocuments({
        repository: savedObjectsRepository,
        types: migrationTypes,
        fixtures: ctx.fixtures.current,
      }),
    },
  ];
  return task.newListr<TaskContext>(subtasks);
};
