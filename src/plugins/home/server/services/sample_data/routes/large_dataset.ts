/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import uuid from 'uuid';
import Path from 'path';
import { Worker } from 'worker_threads';
import { Readable } from 'stream';
import { schema } from '@kbn/config-schema';
import { IRouter, Logger, SavedObject } from '@kbn/core/server';
import { CoreSetup } from '@kbn/core/server';
import { SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import { deleteIndex, createIndex, bulkUpload } from '../lib';
import { getSavedObjectsClient } from './utils';

const dataView = (indexName: string) => {
  return {
    id: uuid.v4(),
    type: 'index-pattern',
    updated_at: Date.now().toString(),
    version: '1',
    migrationVersion: {},
    attributes: {
      title: indexName,
      name: 'Kibana Sample Data Large',
      timeFieldName: 'last_updated',
    },
    references: [],
  };
};

const LARGE_DATASET_ID = 'large_dataset';
const LARGE_DATASET_INDEX_NAME = 'kibana_sample_data_large';

const largeDatasetProvider = function (
  name: string,
  description: string,
  defaultIndex: string,
  savedObjects: SavedObject[]
): SampleDatasetSchema {
  return {
    id: LARGE_DATASET_ID,
    name,
    description,
    previewImagePath: '/plugins/home/assets/sample_data_resources/flights/dashboard.webp',
    darkPreviewImagePath: '/plugins/home/assets/sample_data_resources/flights/dashboard_dark.webp',
    overviewDashboard: '',
    defaultIndex: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
    savedObjects,
    dataIndices: [],
    status: 'installed',
    iconPath: '/plugins/home/assets/sample_data_resources/flights/icon.svg',
  };
};

export function createLargeDatasetRoute(router: IRouter, logger: Logger, core: CoreSetup): void {
  router.post(
    {
      path: '/api/sample_data/large_dataset',
      validate: {
        body: schema.object({ nrOfDocuments: schema.number() }),
      },
    },
    async (context, req, res) => {
      const { nrOfDocuments } = req.body;
      const esClient = (await core.getStartServices())[0].elasticsearch.client;
      const worker = new Worker(Path.join(__dirname, '../worker.js'), {
        workerData: {
          numberOfDocuments: nrOfDocuments,
        },
      });
      try {
        await deleteIndex(esClient, LARGE_DATASET_INDEX_NAME);
        await createIndex(esClient, LARGE_DATASET_INDEX_NAME);
        let delay = 1000;
        let index = 0;
        worker.on('message', async (message) => {
          try {
            if (message.status === 'GENERATED_ITEMS') {
              const { items } = message;
              logger.info('Received items from worker at index ' + index);
              setTimeout(() => {
                bulkUpload(esClient, LARGE_DATASET_INDEX_NAME, items);
              }, delay + index * 1000);
              // backoff, kinda
              index++;
              delay = delay + index * 1000;
            } else if (message.status === 'ERROR') {
              logger.error('Error occurred while generating documents for ES');
            } else if (message.status === 'DONE') {
              const { getImporter } = (await context.core).savedObjects;
              const objectTypes = ['index-pattern'];
              const savedObjectsClient = await getSavedObjectsClient(context, objectTypes);
              const soImporter = getImporter(savedObjectsClient);

              const savedObjects = [dataView(LARGE_DATASET_INDEX_NAME)];
              const readStream = Readable.from(savedObjects);
              const { errors = [] } = await soImporter.import({
                readStream,
                overwrite: true,
                createNewCopies: false,
              });
            }
          } catch (e) {
            logger.error('Error occurred while generating documents for ES');
          }
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
        index: LARGE_DATASET_INDEX_NAME,
      });
      let count = 0;
      if (indexExists) {
        count = (
          await esClient.asInternalUser.count({
            index: LARGE_DATASET_INDEX_NAME,
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
      const esClient = (await core.getStartServices())[0].elasticsearch.client;
      await deleteIndex(esClient, LARGE_DATASET_INDEX_NAME);
      return res.noContent();
    }
  );
}
