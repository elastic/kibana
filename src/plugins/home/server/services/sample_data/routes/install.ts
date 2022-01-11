/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, Logger } from 'src/core/server';
import { SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import { SampleDataUsageTracker } from '../usage/usage';
import { getSavedObjectsClient } from './utils';
import { getUniqueObjectTypes } from '../lib/utils';
import { SampleDataInstaller } from '../sample_data_installer';
import { SampleDataInstallError } from '../errors';

export function createInstallRoute(
  router: IRouter,
  sampleDatasets: SampleDatasetSchema[],
  logger: Logger,
  usageTracker: SampleDataUsageTracker
): void {
  router.post(
    {
      path: '/api/sample_data/{id}',
      validate: {
        params: schema.object({ id: schema.string() }),
        // TODO validate now as date
        query: schema.object({ now: schema.maybe(schema.string()) }),
      },
    },
    async (context, req, res) => {
      const { params, query } = req;
      const sampleDataset = sampleDatasets.find(({ id }) => id === params.id);
      if (!sampleDataset) {
        return res.notFound();
      }
      //  @ts-ignore Custom query validation used
      const now = query.now ? new Date(query.now) : new Date();

      const { getImporter, client: soClient } = context.core.savedObjects;
      const objectTypes = getUniqueObjectTypes(sampleDataset.savedObjects);
      const savedObjectsClient = getSavedObjectsClient(context, objectTypes);
      const soImporter = getImporter(savedObjectsClient);

      const sampleDataInstaller = new SampleDataInstaller({
        esClient: context.core.elasticsearch.client,
        soImporter,
        soClient,
        logger,
        sampleDatasets,
      });

      try {
        const installResult = await sampleDataInstaller.install(params.id, now);
        usageTracker.addInstall(params.id);
        return res.ok({
          body: {
            elasticsearchIndicesCreated: installResult.createdDocsPerIndex,
            kibanaSavedObjectsLoaded: installResult.createdSavedObjects,
          },
        });
      } catch (e) {
        if (e instanceof SampleDataInstallError) {
          return res.customError({
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
