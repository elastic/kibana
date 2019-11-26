/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import Joi from 'joi';
import { schema } from '@kbn/config-schema';
import { IRouter, RequestHandlerContext } from 'src/core/server';
import { PluginInitializerContext } from 'src/core/server';
import { SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import { createIndexName } from '../lib/create_index_name';
import {
  dateToIso8601IgnoringTime,
  translateTimeRelativeToDifference,
  translateTimeRelativeToWeek,
} from '../lib/translate_timestamp';
import { loadData } from '../lib/load_data';

const querySchema = {
  query: Joi.object().keys({ now: Joi.date().iso() }),
};

const insertDataIntoIndex = (
  dataIndexConfig: any,
  index: string,
  nowReference: string,
  context: RequestHandlerContext,
  initContext: PluginInitializerContext
) => {
  const bulkInsert = async (docs: any) => {
    function updateTimestamps(doc: any) {
      dataIndexConfig.timeFields.forEach((timeFieldName: string) => {
        if (doc[timeFieldName]) {
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
        }
      });
      return doc;
    }

    const insertCmd = { index: { _index: index } };
    const bulk: any[] = [];
    docs.forEach((doc: any) => {
      bulk.push(insertCmd);
      bulk.push(updateTimestamps(doc));
    });
    const resp = await context.core.elasticsearch.adminClient.callAsCurrentUser('bulk', {
      body: bulk,
    });
    if (resp.errors) {
      const errMsg = `sample_data install errors while bulk inserting. Elasticsearch response: ${JSON.stringify(
        resp,
        null,
        ''
      )}`;
      initContext.logger.get().debug(errMsg, ['warning']);
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
  initContext: PluginInitializerContext
): void {
  router.post(
    {
      path: '/api/sample_data/{id}',
      validate: {
        params: schema.object({ id: schema.string() }),
        query: schema.object({}, { allowUnknowns: true }),
      },
    },
    async (context, req, res) => {
      const { params, query } = req;
      /*
        We have to use a custom validation for optional query because @kbn/config-schema
        doesn't have a date validation and using schema.maybe effectively returns
        validate: false,
        preventing us from accessing the params, query and body
      */
      const validDate = Joi.validate(query, querySchema);
      if (!validDate) {
        /*
        TODO: add optional query item to @kbn/config-schema
        Having to use a custom Joi validation and over-ride the IRouter config-schema requirements,
        we end up with query: Readonly<{}>.
        Once we have an optional query item in config-schema,
        we can remove this ignore.Property 'now' does not exist on type 'Readonly<{}>'
        */
        //  @ts-ignore
        const errMsg = `Invalid date supplied "${query.now}", using current date`;
        initContext.logger.get().debug(errMsg, ['warning']);
      }
      const sampleDataset = sampleDatasets.find(({ id }) => id === params.id);
      if (!sampleDataset) {
        return res.notFound();
      }
      //  @ts-ignore Custom query validation used
      const now = query.now ? query.now : new Date();
      const nowReference = dateToIso8601IgnoringTime(now);
      const counts = {};
      for (let i = 0; i < sampleDataset.dataIndices.length; i++) {
        const dataIndexConfig = sampleDataset.dataIndices[i];
        const index = createIndexName(sampleDataset.id, dataIndexConfig.id);

        // clean up any old installation of dataset
        try {
          await context.core.elasticsearch.dataClient.callAsCurrentUser('indices.delete', {
            index,
          });
        } catch (err) {
          // ignore delete errors
        }

        try {
          const createIndexParams = {
            index,
            body: {
              settings: { index: { number_of_shards: 1, auto_expand_replicas: '0-1' } },
              mappings: { properties: dataIndexConfig.fields },
            },
          };
          await context.core.elasticsearch.dataClient.callAsCurrentUser(
            'indices.create',
            createIndexParams
          );
        } catch (err) {
          const errMsg = `Unable to create sample data index "${index}", error: ${err.message}`;
          initContext.logger.get().debug(errMsg, ['warning']);
          return res.customError({ body: errMsg, statusCode: err.status });
        }

        try {
          const count = await insertDataIntoIndex(
            dataIndexConfig,
            index,
            nowReference,
            context,
            initContext
          );
          (counts as any)[index] = count;
        } catch (err) {
          const errMsg = `sample_data install errors while loading data. Error: ${err}`;
          initContext.logger.get().debug(errMsg, ['warning']);
          return res.internalError({ body: errMsg });
        }
      }

      let createResults;
      try {
        createResults = await context.core.savedObjects.client.bulkCreate(
          sampleDataset.savedObjects,
          { overwrite: true }
        );
      } catch (err) {
        const errMsg = `bulkCreate failed, error: ${err.message}`;
        initContext.logger.get().debug(errMsg, ['warning']);
        return res.internalError({ body: errMsg });
      }
      const errors = createResults.saved_objects.filter(savedObjectCreateResult => {
        return Boolean(savedObjectCreateResult.error);
      });
      if (errors.length > 0) {
        const errMsg = `sample_data install errors while loading saved objects. Errors: ${errors.join(
          ','
        )}`;
        initContext.logger.get().debug(errMsg, ['warning']);
        return res.customError({ body: errMsg, statusCode: 403 });
      }
      // track the usage operation in a non-blocking way -> cannot move this to the NP yet

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
