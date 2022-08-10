/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IRouter, Logger } from '@kbn/core/server';
import { spawn } from 'child_process';
import { SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import { SampleDataUsageTracker } from '../usage/usage';

export function createInstallLargeDatasetRoute(
  router: IRouter,
  sampleDatasets: SampleDatasetSchema[],
  logger: Logger,
  usageTracker: SampleDataUsageTracker
): void {
  router.post(
    {
      path: '/api/sample_data/large_dataset',
      validate: {},
    },
    async (context, req, res) => {
      logger.info('Called');
      let error = false;
      const pythonProcess = spawn(
        'python3',
        [
          'es_test_data.py',
          '--username=elastic',
          '--password=changeme',
          '--index_name=kibana_sample_dataset_large',
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
        // Here is where the error output goes
        error = true;
        logger.error('stderr: ' + data);
      });

      if (error) {
        return res.customError({
          statusCode: 500,
          body: {
            message: 'Error occurred while generating data set',
          },
        });
      }

      pythonProcess.on('close', function (code) {});

      return res.ok({
        body: {
          elasticsearchIndicesCreated: 10,
          kibanaSavedObjectsLoaded: 10,
        },
      });
    }
  );
}
