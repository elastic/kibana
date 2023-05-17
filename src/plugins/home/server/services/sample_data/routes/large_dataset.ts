/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { v4 as uuidv4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import { IRouter, Logger, CoreSetup } from '@kbn/core/server';
import { initializeWorker, clearIndex } from '../workers/helper/worker_helper';
import type { WorkerData } from '../workers/helper/worker_helper';
import { deleteIndex, findAndDeleteDataView } from '../lib';
import { getSavedObjectsClient } from './utils';

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
          workerData.numberOfFields!--;
        });
        workerData.additionalFormat = JSON.stringify(format);
      }
      const { savedObjects } = await context.core;
      const savedObjectsClient = await getSavedObjectsClient(context, ['index-pattern']);

      try {
        await clearIndex(esClient, largeDatasetIndexName);
        const worker = await initializeWorker(
          'large_dataset_worker',
          workerData,
          esClient,
          savedObjects,
          savedObjectsClient,
          largeDatasetIndexName,
          logger
        );
        workerState[id] = worker;
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
