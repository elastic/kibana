/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from 'src/core/server';
import { SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import { SampleDataUsageTracker } from '../usage/usage';
import { getSampleDataInstaller } from './utils';
import { SampleDataInstallError } from '../errors';

export function createUninstallRoute(
  router: IRouter,
  sampleDatasets: SampleDatasetSchema[],
  logger: Logger,
  usageTracker: SampleDataUsageTracker
): void {
  router.delete(
    {
      path: '/api/sample_data/{id}',
      validate: {
        params: schema.object({ id: schema.string() }),
      },
    },
    async (context, request, response) => {
      const sampleDataset = sampleDatasets.find(({ id }) => id === request.params.id);
      if (!sampleDataset) {
        return response.notFound();
      }

      const sampleDataInstaller = getSampleDataInstaller({
        datasetId: sampleDataset.id,
        sampleDatasets,
        logger,
        context,
      });

      try {
        await sampleDataInstaller.uninstall(request.params.id);
        // track the usage operation in a non-blocking way
        usageTracker.addUninstall(request.params.id);
        return response.noContent();
      } catch (e) {
        if (e instanceof SampleDataInstallError) {
          return response.customError({
            body: {
              message: e.message,
            },
            statusCode: e.httpCode,
          });
        }
        throw e;
      }
    }
  );
}
