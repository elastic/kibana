/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ListrTask } from 'listr2';
import { isEqual } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getKibanaMigratorTestKit } from '@kbn/migrator-test-kit';
import { encryptionOverrides, type Task, type TaskContext } from '../types';
import { getPreviousVersionType } from '../../migrations';
import { checkDocuments } from './check_documents';
import { getRollbackMigrationContext } from './rollback_context';
import { getMigratorOptions } from '../algorithms';

interface IndexState {
  aliases: string[];
  meta: object | undefined;
}

const getIndexState = async (
  client: ElasticsearchClient,
  kibanaIndex: string
): Promise<IndexState> => {
  const [{ aliases = {}, mappings = {} }] = Object.values(
    await client.indices.get({ index: kibanaIndex })
  );
  return { aliases: Object.keys(aliases).sort(), meta: mappings._meta };
};

export const testRollback: Task = async (ctx, task) => {
  const { migrationTypes, migrationKibanaIndex, migrationAlgorithm } =
    getRollbackMigrationContext(ctx);
  const { baselineMappings } = ctx;

  const previousVersionTypes = migrationTypes.map((type) =>
    getPreviousVersionType({ type, previousMappings: baselineMappings! })
  );

  const {
    runMigrations: performRollback,
    savedObjectsRepository,
    client,
  } = await getKibanaMigratorTestKit({
    types: previousVersionTypes,
    kibanaIndex: migrationKibanaIndex,
    ...getMigratorOptions(migrationAlgorithm, 'rollback'),
    encryptionExtensionFactory: ctx.encryptedSavedObjects
      ? (typeRegistry) =>
          ctx.encryptedSavedObjects!.__testCreateDangerousExtension(
            typeRegistry,
            encryptionOverrides
          )
      : undefined,
  });

  let indexStateBeforeRollback: IndexState | undefined;
  const subtasks: ListrTask<TaskContext>[] = [
    {
      title: `Run rollback migration on updated types: '${migrationTypes
        .map(({ name }) => name)
        .join(', ')}'`,
      task: async () => {
        indexStateBeforeRollback = await getIndexState(client, migrationKibanaIndex);
        await performRollback();
      },
    },
    {
      title: `Ensure the rollback left the index's aliases and _meta untouched`,
      task: async () => {
        const after = await getIndexState(client, migrationKibanaIndex);
        if (!isEqual(after, indexStateBeforeRollback)) {
          throw new Error(
            `The rollback updated the '${migrationKibanaIndex}' index. Before: ${JSON.stringify(
              indexStateBeforeRollback
            )}, after: ${JSON.stringify(after)}`
          );
        }
      },
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
