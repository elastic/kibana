/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from 'src/core/server';
import { SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import { createIndexName } from '../lib/create_index_name';
import { SampleDataUsageTracker } from '../usage/usage';
import { findSampleObjects } from '../lib/find_sample_objects';
import { getUniqueObjectTypes } from '../lib/utils';
import { getSavedObjectsClient } from './utils';

export function createUninstallRoute(
  router: IRouter,
  sampleDatasets: SampleDatasetSchema[],
  logger: Logger,
  usageTracker: SampleDataUsageTracker
): void {
  router.delete(
    {
      path: '/api/sample_data/{id}',
      validate: {
        params: schema.object({ id: schema.string() }),
      },
    },
    async (context, request, response) => {
      const sampleDataset = sampleDatasets.find(({ id }) => id === request.params.id);

      if (!sampleDataset) {
        return response.notFound();
      }

      for (let i = 0; i < sampleDataset.dataIndices.length; i++) {
        const dataIndexConfig = sampleDataset.dataIndices[i];
        const index = createIndexName(sampleDataset.id, dataIndexConfig.id);

        try {
          await context.core.elasticsearch.client.asCurrentUser.indices.delete({
            index,
          });
        } catch (err) {
          return response.customError({
            statusCode: err.status,
            body: {
              message: `Unable to delete sample data index "${index}", error: ${err.message}`,
            },
          });
        }
      }

      const objects = sampleDataset.savedObjects.map(({ type, id }) => ({ type, id }));
      const objectTypes = getUniqueObjectTypes(objects);
      const client = getSavedObjectsClient(context, objectTypes);
      const findSampleObjectsResult = await findSampleObjects({ client, logger, objects });

      const objectsToDelete = findSampleObjectsResult.filter(({ foundObjectId }) => foundObjectId);
      const deletePromises = objectsToDelete.map(({ type, foundObjectId }) =>
        client.delete(type, foundObjectId!)
      );

      try {
        await Promise.all(deletePromises);
      } catch (err) {
        return response.customError({
          statusCode: err.status,
          body: {
            message: `Unable to delete sample dataset saved objects, error: ${err.message}`,
          },
        });
      }

      // track the usage operation in a non-blocking way
      usageTracker.addUninstall(request.params.id);

      return response.noContent();
    }
  );
}
