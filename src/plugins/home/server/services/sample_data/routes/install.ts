/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import { schema } from '@kbn/config-schema';
import { IRouter, Logger, IScopedClusterClient } from 'src/core/server';
import { SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import { createIndexName } from '../lib/create_index_name';
import {
  dateToIso8601IgnoringTime,
  translateTimeRelativeToDifference,
  translateTimeRelativeToWeek,
} from '../lib/translate_timestamp';
import { loadData } from '../lib/load_data';
import { SampleDataUsageTracker } from '../usage/usage';
import { getSavedObjectsClient } from './utils';
import { getUniqueObjectTypes } from '../lib/utils';

const insertDataIntoIndex = (
  dataIndexConfig: any,
  index: string,
  nowReference: string,
  esClient: IScopedClusterClient,
  logger: Logger
) => {
  function updateTimestamps(doc: any) {
    dataIndexConfig.timeFields
      .filter((timeFieldName: string) => doc[timeFieldName])
      .forEach((timeFieldName: string) => {
        doc[timeFieldName] = dataIndexConfig.preserveDayOfWeekTimeOfDay
          ? translateTimeRelativeToWeek(
              doc[timeFieldName],
              dataIndexConfig.currentTimeMarker,
              nowReference
            )
          : translateTimeRelativeToDifference(
              doc[timeFieldName],
              dataIndexConfig.currentTimeMarker,
              nowReference
            );
      });
    return doc;
  }

  const bulkInsert = async (docs: any) => {
    const insertCmd = { index: { _index: index } };
    const bulk: any[] = [];
    docs.forEach((doc: any) => {
      bulk.push(insertCmd);
      bulk.push(updateTimestamps(doc));
    });

    const { body: resp } = await esClient.asCurrentUser.bulk({
      body: bulk,
    });

    if (resp.errors) {
      const errMsg = `sample_data install errors while bulk inserting. Elasticsearch response: ${JSON.stringify(
        resp,
        null,
        ''
      )}`;
      logger.warn(errMsg);
      return Promise.reject(
        new Error(`Unable to load sample data into index "${index}", see kibana logs for details`)
      );
    }
  };
  return loadData(dataIndexConfig.dataPath, bulkInsert); // this returns a Promise
};

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
      const nowReference = dateToIso8601IgnoringTime(now);
      const counts = {};
      for (let i = 0; i < sampleDataset.dataIndices.length; i++) {
        const dataIndexConfig = sampleDataset.dataIndices[i];
        const index = createIndexName(sampleDataset.id, dataIndexConfig.id);

        // clean up any old installation of dataset
        try {
          await context.core.elasticsearch.client.asCurrentUser.indices.delete({
            index,
          });
        } catch (err) {
          // ignore delete errors
        }

        try {
          await context.core.elasticsearch.client.asCurrentUser.indices.create({
            index,
            body: {
              settings: { index: { number_of_shards: 1, auto_expand_replicas: '0-1' } },
              mappings: { properties: dataIndexConfig.fields },
            },
          });
        } catch (err) {
          const errMsg = `Unable to create sample data index "${index}", error: ${err.message}`;
          logger.warn(errMsg);
          return res.customError({ body: errMsg, statusCode: err.status });
        }

        try {
          const count = await insertDataIntoIndex(
            dataIndexConfig,
            index,
            nowReference,
            context.core.elasticsearch.client,
            logger
          );
          (counts as any)[index] = count;
        } catch (err) {
          const errMsg = `sample_data install errors while loading data. Error: ${err}`;
          throw new Error(errMsg);
        }
      }

      const { getImporter } = context.core.savedObjects;
      const objectTypes = getUniqueObjectTypes(sampleDataset.savedObjects);
      const savedObjectsClient = getSavedObjectsClient(context, objectTypes);
      const importer = getImporter(savedObjectsClient);

      const savedObjects = sampleDataset.savedObjects.map(({ version, ...obj }) => obj);
      const readStream = Readable.from(savedObjects);

      try {
        const { errors = [] } = await importer.import({
          readStream,
          overwrite: true,
          createNewCopies: false,
        });
        if (errors.length > 0) {
          const errMsg = `sample_data install errors while loading saved objects. Errors: ${JSON.stringify(
            errors.map(({ type, id, error }) => ({ type, id, error })) // discard other fields
          )}`;
          logger.warn(errMsg);
          return res.customError({ body: errMsg, statusCode: 500 });
        }
      } catch (err) {
        const errMsg = `import failed, error: ${err.message}`;
        throw new Error(errMsg);
      }
      usageTracker.addInstall(params.id);

      // FINALLY
      return res.ok({
        body: {
          elasticsearchIndicesCreated: counts,
          kibanaSavedObjectsLoaded: sampleDataset.savedObjects.length,
        },
      });
    }
  );
}
