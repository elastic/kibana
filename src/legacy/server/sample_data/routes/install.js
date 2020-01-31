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

import Boom from 'boom';
import Joi from 'joi';
import { usage } from '../usage';
import { loadData } from './lib/load_data';
import { createIndexName } from './lib/create_index_name';
import {
  dateToIso8601IgnoringTime,
  translateTimeRelativeToDifference,
  translateTimeRelativeToWeek,
} from './lib/translate_timestamp';

function insertDataIntoIndex(
  dataIndexConfig,
  index,
  nowReference,
  request,
  server,
  callWithRequest
) {
  const bulkInsert = async docs => {
    function updateTimestamps(doc) {
      dataIndexConfig.timeFields.forEach(timeFieldName => {
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

    const bulk = [];
    docs.forEach(doc => {
      bulk.push(insertCmd);
      bulk.push(updateTimestamps(doc));
    });
    const resp = await callWithRequest(request, 'bulk', { body: bulk });
    if (resp.errors) {
      server.log(
        ['warning'],
        `sample_data install errors while bulk inserting. Elasticsearch response: ${JSON.stringify(
          resp,
          null,
          ''
        )}`
      );
      return Promise.reject(
        new Error(`Unable to load sample data into index "${index}", see kibana logs for details`)
      );
    }
  };

  return loadData(dataIndexConfig.dataPath, bulkInsert);
}

export const createInstallRoute = () => ({
  path: '/api/sample_data/{id}',
  method: 'POST',
  config: {
    validate: {
      query: Joi.object().keys({ now: Joi.date().iso() }),
      params: Joi.object()
        .keys({ id: Joi.string().required() })
        .required(),
    },
    handler: async (request, h) => {
      const { server, params, query } = request;

      const sampleDataset = server.getSampleDatasets().find(({ id }) => id === params.id);
      if (!sampleDataset) {
        return h.response().code(404);
      }

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

      const now = query.now ? query.now : new Date();
      const nowReference = dateToIso8601IgnoringTime(now);

      const counts = {};
      for (let i = 0; i < sampleDataset.dataIndices.length; i++) {
        const dataIndexConfig = sampleDataset.dataIndices[i];
        const index = createIndexName(sampleDataset.id, dataIndexConfig.id);

        // clean up any old installation of dataset
        try {
          await callWithRequest(request, 'indices.delete', { index });
        } catch (err) {
          // ignore delete errors
        }

        try {
          const createIndexParams = {
            index: index,
            body: {
              settings: { index: { number_of_shards: 1, auto_expand_replicas: '0-1' } },
              mappings: { properties: dataIndexConfig.fields },
            },
          };
          await callWithRequest(request, 'indices.create', createIndexParams);
        } catch (err) {
          const errMsg = `Unable to create sample data index "${index}", error: ${err.message}`;
          server.log(['warning'], errMsg);
          return h.response(errMsg).code(err.status);
        }

        try {
          const count = await insertDataIntoIndex(
            dataIndexConfig,
            index,
            nowReference,
            request,
            server,
            callWithRequest
          );
          counts[index] = count;
        } catch (err) {
          server.log(['warning'], `sample_data install errors while loading data. Error: ${err}`);
          return h.response(err.message).code(500);
        }
      }

      let createResults;
      try {
        createResults = await request
          .getSavedObjectsClient()
          .bulkCreate(sampleDataset.savedObjects, { overwrite: true });
      } catch (err) {
        server.log(['warning'], `bulkCreate failed, error: ${err.message}`);
        return Boom.badImplementation(
          `Unable to load kibana saved objects, see kibana logs for details`
        );
      }
      const errors = createResults.saved_objects.filter(savedObjectCreateResult => {
        return Boolean(savedObjectCreateResult.error);
      });
      if (errors.length > 0) {
        server.log(
          ['warning'],
          `sample_data install errors while loading saved objects. Errors: ${errors.join(',')}`
        );
        return h
          .response(`Unable to load kibana saved objects, see kibana logs for details`)
          .code(403);
      }

      // track the usage operation in a non-blocking way
      usage(request).addInstall(params.id);

      return h.response({
        elasticsearchIndicesCreated: counts,
        kibanaSavedObjectsLoaded: sampleDataset.savedObjects.length,
      });
    },
  },
});
