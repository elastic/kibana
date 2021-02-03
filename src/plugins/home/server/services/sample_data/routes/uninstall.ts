/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import _ from 'lodash';
import { IRouter } from 'src/core/server';
import { SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import { createIndexName } from '../lib/create_index_name';
import { SampleDataUsageTracker } from '../usage/usage';

export function createUninstallRoute(
  router: IRouter,
  sampleDatasets: SampleDatasetSchema[],
  usageTracker: SampleDataUsageTracker
): void {
  router.delete(
    {
      path: '/api/sample_data/{id}',
      validate: {
        params: schema.object({ id: schema.string() }),
      },
    },
    async (
      {
        core: {
          elasticsearch: {
            legacy: {
              client: { callAsCurrentUser },
            },
          },
          savedObjects: { client: savedObjectsClient },
        },
      },
      request,
      response
    ) => {
      const sampleDataset = sampleDatasets.find(({ id }) => id === request.params.id);

      if (!sampleDataset) {
        return response.notFound();
      }

      for (let i = 0; i < sampleDataset.dataIndices.length; i++) {
        const dataIndexConfig = sampleDataset.dataIndices[i];
        const index = createIndexName(sampleDataset.id, dataIndexConfig.id);

        try {
          await callAsCurrentUser('indices.delete', { index });
        } catch (err) {
          return response.customError({
            statusCode: err.status,
            body: {
              message: `Unable to delete sample data index "${index}", error: ${err.message}`,
            },
          });
        }
      }

      const deletePromises = sampleDataset.savedObjects.map(({ type, id }) =>
        savedObjectsClient.delete(type, id)
      );

      try {
        await Promise.all(deletePromises);
      } catch (err) {
        // ignore 404s since users could have deleted some of the saved objects via the UI
        if (_.get(err, 'output.statusCode') !== 404) {
          return response.customError({
            statusCode: err.status,
            body: {
              message: `Unable to delete sample dataset saved objects, error: ${err.message}`,
            },
          });
        }
      }

      // track the usage operation in a non-blocking way
      usageTracker.addUninstall(request.params.id);

      return response.noContent();
    }
  );
}
