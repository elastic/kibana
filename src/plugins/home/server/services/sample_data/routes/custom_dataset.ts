/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { getSavedObjectsClient } from './utils';
import { WorkerData, initializeWorker, clearIndex } from '../workers/helper/worker_helper';

const customDatasetIndexName = 'kibana_sample_data_custom';
const workerName = 'custom_dataset_worker';

export function createCustomDatasetRoute(router: IRouter, logger: Logger, core: CoreSetup): void {
  router.post(
    {
      path: '/api/sample_data/custom_dataset',
      validate: {
        body: schema.object({
          nrOfDocuments: schema.number(),
          fieldFormat: schema.arrayOf(
            schema.object({
              name: schema.string(),
              type: schema.string(),
              distinctValues: schema.number(),
            })
          ),
        }),
      },
    },
    async (context, req, res) => {
      const { nrOfDocuments, fieldFormat } = req.body;
      const esClient = (await core.getStartServices())[0].elasticsearch.client;
      const workerData: WorkerData = {
        numberOfDocuments: nrOfDocuments,
        fieldFormat: JSON.stringify(fieldFormat),
      };
      try {
        await clearIndex(esClient, customDatasetIndexName);
        const { savedObjects } = await context.core;
        const savedObjectsClient = await getSavedObjectsClient(context, ['index-pattern']);
        const worker = await initializeWorker(
          workerName,
          workerData,
          esClient,
          savedObjects,
          savedObjectsClient,
          customDatasetIndexName,
          logger
        );
        worker.postMessage('start');
      } catch (e) {
        return res.customError({
          statusCode: 500,
          body: 'An error occurred while calling Elasticsearch',
        });
      }
      return res.ok({
        body: {
          elasticsearchIndicesCreated: 1,
          kibanaSavedObjectsLoaded: 1,
        },
      });
    }
  );
}
