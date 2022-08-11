/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { spawn } from 'child_process';
import { Readable } from 'stream';
import uuid from 'uuid';
import { schema } from '@kbn/config-schema';
import { IRouter, Logger } from '@kbn/core/server';
import { SampleDataInstallError } from '../errors';
import { getSavedObjectsClient } from './utils';
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

export function createInstallLargeDatasetRoute(
  router: IRouter,
  sampleDatasets: SampleDatasetSchema[],
  logger: Logger
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
        [
          'es_test_data.py',
          '--username=elastic',
          '--password=changeme',
          '--index_name=${indexName}',
          '--count=${nrOfDocuments}',
        ],
        { shell: true }
      );

      pythonProcess.stdout.setEncoding('utf8');
      pythonProcess.stdout.on('data', function (data) {
        // Here is where the output goes

        logger.info('stdout: ' + data);
      });

      pythonProcess.stderr.setEncoding('utf8');
      pythonProcess.stderr.on('error', function (data) {
        errorOccured = true;
        logger.error('stderr: ' + data);
      });

      const core = await context.core;
      const { getImporter, client: soClient } = core.savedObjects;
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
      if (errors.length > 0) {
        const errMsg = `sample_data install errors while loading saved objects. Errors: ${JSON.stringify(
          errors.map(({ type, id }) => ({ type, id })) // discard other fields
        )}`;
        logger.warn(errMsg);
        throw new SampleDataInstallError(errMsg, 500);
      }

      if (errorOccured) {
        return res.customError({
          statusCode: 500,
          body: {
            message: 'Error occurred while generating data set',
          },
        });
      }

      // pythonProcess.on('close', function (code) {});

      return res.ok({
        body: {
          elasticsearchIndicesCreated: 10,
          kibanaSavedObjectsLoaded: 10,
        },
      });
    }
  );
}
