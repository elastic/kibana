/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ListrTask } from 'listr2';
import { defaultKibanaIndex, getKibanaMigratorTestKit } from '@kbn/migrator-test-kit';
import type { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import type { Task, TaskContext } from '../types';
import { getPreviousVersionType } from '../../migrations';
import { checkDocuments } from './check_documents';
import type { FixtureTemplate } from '../../migrations/fixtures';

export const createBaseline: Task = async (ctx, task) => {
  const { updatedTypes, baselineMappings } = ctx;

  const previousVersionTypes = updatedTypes.map((type) =>
    getPreviousVersionType({ type, previousMappings: baselineMappings! })
  );

  const {
    client,
    runMigrations: initSystemIndex,
    savedObjectsRepository,
  } = await getKibanaMigratorTestKit({ types: previousVersionTypes });
  const subtasks: ListrTask<TaskContext>[] = [
    {
      title: `Delete pre-existing '${defaultKibanaIndex}' index`,
      task: async () => {
        // TODO the delete operation does not seem to delete the system index
        // this causes issues when running multiple times with the --server and --client flags
        await client.indices.delete({
          index: defaultKibanaIndex,
          ignore_unavailable: true,
        });
      },
    },
    {
      title: `Create '${defaultKibanaIndex}' index with previous version mappings`,
      task: async () => await initSystemIndex(),
    },
    {
      title: `Populate '${defaultKibanaIndex}' index with previous version objects`,
      task: async () => {
        // convert the fixtures into SavedObjectsBulkCreateObject[]
        const allDocs = Object.entries(ctx.fixtures.previous).flatMap(
          ([type, { version, documents }]) => {
            // When a type has no migrations nor modelVersions
            // we should not send the typeMigrationVersion field
            if (version === '0.0.0') {
              version = undefined as unknown as string;
            }

            return documents.map<SavedObjectsBulkCreateObject<FixtureTemplate>>((attributes) => ({
              type,
              attributes,
              typeMigrationVersion: version,
            }));
          }
        );
        // insert all fixtures in the `.kibana_migrator` SO index
        await savedObjectsRepository.bulkCreate(allDocs, {
          refresh: 'wait_for',
        });
      },
    },
    {
      title: `Ensure fixtures have been correctly populated`,
      task: checkDocuments({
        repository: savedObjectsRepository,
        types: previousVersionTypes,
        fixtures: ctx.fixtures.previous,
      }),
    },
  ];
  return task.newListr(subtasks);
};
