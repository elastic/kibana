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

const dataView = (indexName: string) => {
  return {
    id: uuid.v4(),
    type: 'index-pattern',
    updated_at: '2018-05-09T15:49:03.736Z',
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

export function createInstallLargeDatasetRoute(
  router: IRouter,
  logger: Logger,
  core: CoreSetup,
  installCompleteCallback?: (id: SampleDatasetSchema) => void
): void {
  router.post(
    {
      path: '/api/sample_data/large_dataset',
      validate: {
        body: schema.object({ indexName: schema.string(), nrOfDocuments: schema.number() }),
      },
    },
    async (context, req, res) => {
      const { nrOfDocuments } = req.body;
      const indexName = 'kibana_sample_data_large';
      logger.info(`Called ${nrOfDocuments}`);
      (async () => {
        const esClient = (await core.getStartServices())[0].elasticsearch.client;
        const worker = new Worker(Path.join(__dirname, '../worker.js'), {
          workerData: {
            numberOfDocuments: nrOfDocuments,
          },
        });
        const indexExists = await esClient.asInternalUser.indices.exists({
          index: indexName,
        });
        if (indexExists) {
          await esClient.asInternalUser.indices.delete({
            index: indexName,
          });
        }
        await esClient.asInternalUser.indices.create({
          index: indexName,
          settings: {
            number_of_shards: 2,
            number_of_replicas: 0,
          },
        });

        worker.on('message', async (message) => {
          console.log('Message from worker');
          if (message.status === 'DONE') {
            const { items } = message;
            const operations = JSON.parse(items).flatMap((doc) => [
              { index: { _index: indexName } },
              doc,
            ]);
            const bulkResponse = await esClient.asInternalUser.bulk({ refresh: true, operations });
            if (bulkResponse.errors) {
              const erroredDocuments = [];
              // The items array has the same order of the dataset we just indexed.
              // The presence of the `error` key indicates that the operation
              // that we did for the document has failed.
              bulkResponse.items.forEach((action, i) => {
                const operation = Object.keys(action)[0];
                if (action[operation].error) {
                  erroredDocuments.push({
                    // If the status is 429 it means that you can retry the document,
                    // otherwise it's very likely a mapping error, and you should
                    // fix the document before to try it again.
                    status: action[operation].status,
                    error: action[operation].error,
                  });
                }
              });
              console.log(erroredDocuments);
            }
          }
        });

        worker.postMessage('setup');
        worker.postMessage('start');
      })();

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
        index: 'kibana_sample_data_large',
      });
      if (!indexExists) {
        return res.notFound();
      }
      return res.ok({
        body: {
          status: 'installed',
        },
      });
    }
  );
}
