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
import { schema } from '@kbn/config-schema';
import { IRouter, Logger, SavedObject } from '@kbn/core/server';
import { CoreSetup } from '@kbn/core/server';
import { SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import { deleteIndex, createIndex, bulkUpload } from '../lib';

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
      logger.info(`Called ${nrOfDocuments}`);

      const esClient = (await core.getStartServices())[0].elasticsearch.client;
      const worker = new Worker(Path.join(__dirname, '../worker.js'), {
        workerData: {
          numberOfDocuments: nrOfDocuments,
        },
      });
      await deleteIndex(esClient, LARGE_DATASET_INDEX_NAME);
      await createIndex(esClient, LARGE_DATASET_INDEX_NAME);
      worker.on('message', async (message) => {
        if (message.status === 'DONE') {
          const { items } = message;
          logger.info('Received items from worker');

          bulkUpload(esClient, LARGE_DATASET_INDEX_NAME, items);
          // TODO: add error handling
        } else if (message.status === 'ERROR') {
          logger.error('Error occurred while generating documents for ES');
        }
      });
      worker.postMessage('start');

      /*
      const core = await context.core;
      const { getImporter } = core.savedObjects;
      const objectTypes = ['index-pattern'];
      const savedObjectsClient = await getSavedObjectsClient(context, objectTypes);
      const soImporter = getImporter(savedObjectsClient);

      const savedObjects = [dataView(indexName)];
      const readStream = Readable.from(savedObjects);

      const { errors = [] } = await soImporter.import({
        readStream,
        overwrite: true,
        createNewCopies: false,
      });
      logger.info('Started process');
      if (errors.length > 0) {
        const errMsg = `sample_data install errors while loading saved objects. Errors: ${JSON.stringify(
          errors.map(({ type, id }) => ({ type, id })) // discard other fields
        )}`;
        logger.warn(errMsg);
        throw new SampleDataInstallError(errMsg, 500);
      }

      pythonProcess.stdout.on('data', function (data) {
        logger.info('stdout: ' + data);
        installCompleteCallback(
          largeDatasetProvider(indexName, 'Large dataset', indexName, savedObjects)
        );
      });

      if (errorOccured) {
        return res.customError({
          statusCode: 500,
          body: {
            message: 'Error occurred while generating data set',
          },
        });
      }
      pythonProcess.on('close', function (code) {
        logger.info('Closed with code ' + code);
      });
      return res.ok({
        body: {
          elasticsearchIndicesCreated: 1,
          kibanaSavedObjectsLoaded: 1,
        },
      });*/
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
