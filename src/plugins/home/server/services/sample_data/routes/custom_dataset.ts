/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { Worker } from 'worker_threads';
import Path from 'path';
import { bulkUpload, createDataView, createIndex, deleteIndex } from '../lib';
import { getSavedObjectsClient } from './utils';
import { WorkerData } from '../workers/generate_custom_dataset';

const CUSTOM_DATASET_INDEX_NAME = 'kibana_sample_data_custom';

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
      const worker = new Worker(Path.join(__dirname, '../workers/custom_dataset_worker.js'), {
        workerData,
      });
      try {
        await deleteIndex(esClient, CUSTOM_DATASET_INDEX_NAME);
        await createIndex(esClient, CUSTOM_DATASET_INDEX_NAME);
        let delay = 0;
        let index = 0;
        worker.on('message', async (message) => {
          try {
            if (message.status === 'GENERATED_ITEMS') {
              const { items } = message;
              logger.info('Received items from worker at index ' + index);
              setTimeout(() => {
                bulkUpload(esClient, CUSTOM_DATASET_INDEX_NAME, items);
              }, delay);
              // backoff, kinda
              index++;
              delay = index * 500;
            } else if (message.status === 'DONE') {
              const { savedObjects } = await context.core;
              const savedObjectsClient = await getSavedObjectsClient(context, ['index-pattern']);
              const result = await createDataView(
                CUSTOM_DATASET_INDEX_NAME,
                'Kibana Sample Data Custom',
                savedObjects,
                savedObjectsClient
              );
              if (result.errors.length > 0) {
                logger.error('Error occurred while creating a data view');
              }
            } else if (message.status === 'ERROR') {
              logger.error('Error occurred while generating documents for ES');
            }
          } catch (e) {
            logger.error('Error occurred while generating documents for ES');
          }
        });
        worker.on('error', (message) => {
          logger.error(message);
        });
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
