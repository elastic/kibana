/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import Path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Worker } from 'worker_threads';
import { schema } from '@kbn/config-schema';
import { IRouter, Logger, CoreSetup } from '@kbn/core/server';
import {
  deleteIndex,
  createIndex,
  bulkUpload,
  createDataView,
  findAndDeleteDataView,
} from '../lib';
import { getSavedObjectsClient } from './utils';
import { WorkerData } from '../workers/generate_large_dataset';

const largeDatasetIndexName = 'kibana_sample_data_large';
const workerState = {} as Record<string, any>;
let id: string | undefined;

export function createLargeDatasetRoute(router: IRouter, logger: Logger, core: CoreSetup): void {
  router.post(
    {
      path: '/api/sample_data/large_dataset',
      validate: {
        body: schema.object({
          nrOfDocuments: schema.number(),
          nrOfFields: schema.number(),
          fieldValues: schema.maybe(
            schema.arrayOf(
              schema.object({
                name: schema.string(),
                type: schema.string(),
              })
            )
          ),
        }),
      },
    },
    async (context, req, res) => {
      const { nrOfDocuments, nrOfFields, fieldValues } = req.body;
      const esClient = (await core.getStartServices())[0].elasticsearch.client;
      id = uuidv4();
      const workerData: WorkerData = {
        numberOfDocuments: nrOfDocuments,
        numberOfFields: nrOfFields,
      };
      if (fieldValues && fieldValues.length > 0) {
        const format: string[] = [];
        fieldValues.forEach((el) => {
          format.push(`${el.name}:${el.type}`);
          workerData.numberOfFields--;
        });
        workerData.additionalFormat = JSON.stringify(format);
      }
      const worker = new Worker(Path.join(__dirname, '../workers/large_dataset_worker.js'), {
        workerData,
      });
      workerState[id] = worker;
      try {
        await deleteIndex(esClient, largeDatasetIndexName);
        await createIndex(esClient, largeDatasetIndexName);
        let delay = 0;
        let index = 0;
        worker.on('message', async (message) => {
          try {
            if (message.status === 'GENERATED_ITEMS') {
              const { items } = message;
              logger.info('Received items from worker at index ' + index);
              setTimeout(() => {
                bulkUpload(esClient, largeDatasetIndexName, items);
              }, delay);
              // backoff, kinda
              index++;
              delay = index * 500;
            } else if (message.status === 'DONE') {
              const { savedObjects } = await context.core;
              const savedObjectsClient = await getSavedObjectsClient(context, ['index-pattern']);
              const result = await createDataView(
                largeDatasetIndexName,
                'Kibana Sample Data Large',
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

export function createIsLargeDataSetInstalledRoute(router: IRouter, core: CoreSetup) {
  router.get(
    { path: '/api/sample_data/large_dataset/installed', validate: false },
    async (context, _req, res) => {
      const esClient = (await core.getStartServices())[0].elasticsearch.client;
      const indexExists = await esClient.asInternalUser.indices.exists({
        index: largeDatasetIndexName,
      });
      let count = 0;
      if (indexExists) {
        count = (
          await esClient.asInternalUser.count({
            index: largeDatasetIndexName,
          })
        ).count;
      }
      return res.ok({
        body: {
          installed: indexExists,
          count,
        },
      });
    }
  );
}

export function deleteLargeDatasetRoute(router: IRouter, logger: Logger, core: CoreSetup): void {
  router.delete(
    { path: '/api/sample_data/large_dataset', validate: false },
    async (context, _req, res) => {
      if (id) {
        workerState[id].postMessage('stop');
      }
      try {
        const esClient = (await core.getStartServices())[0].elasticsearch.client;
        const savedObjectsClient = await getSavedObjectsClient(context, ['index-pattern']);
        await deleteIndex(esClient, largeDatasetIndexName);
        await findAndDeleteDataView(largeDatasetIndexName, savedObjectsClient);
      } catch (e) {
        return res.customError({ statusCode: 500, body: 'An error occurred.' });
      }
      return res.noContent();
    }
  );
}
