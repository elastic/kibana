/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { spawn } from 'child_process';
import uuid from 'uuid';
import { schema } from '@kbn/config-schema';
import { IRouter, Logger, SavedObject } from '@kbn/core/server';
import { CoreSetup } from '@kbn/core/server';
import { Readable } from 'stream';
import { getSavedObjectsClient } from './utils';
import { SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import { SampleDataInstallError } from '../errors';

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
  sampleDatasets: SampleDatasetSchema[],
  logger: Logger,
  installCompleteCallback: (id: SampleDatasetSchema) => void
): void {
  router.post(
    {
      path: '/api/sample_data/large_dataset/{indexName}/{nrOfDocuments}',
      validate: {
        params: schema.object({ indexName: schema.string(), nrOfDocuments: schema.number() }),
      },
    },
    async (context, req, res) => {
      const { indexName, nrOfDocuments } = req.params;
      logger.info(`Called ${indexName} ${nrOfDocuments}`);
      let errorOccured = false;
      const pythonProcess = spawn(
        'python3',
        ['es_test_data.py', 'username=elastic', 'password="changeme"'],
        {
          shell: true,
        }
      );

      pythonProcess.stdout.setEncoding('utf8');
      pythonProcess.stderr.setEncoding('utf8');
      pythonProcess.stderr.on('error', function (data) {
        errorOccured = true;
        logger.error('stderr: ' + data);
      });

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
        index: 'test_data',
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
