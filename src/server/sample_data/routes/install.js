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

import { loadData } from './lib/load_data';
import { createIndexName } from './lib/create_index_name';
import { adjustTimestamp } from './lib/adjust_timestamp';

export const createInstallRoute = () => ({
  path: '/api/sample_data/{id}',
  method: 'POST',
  config: {
    validate: {
      params: Joi.object().keys({
        id: Joi.string().required(),
      }).required()
    },
    handler: async (request, reply) => {
      const server = request.server;
      const sampleDataset = server.getSampleDatasets().find(sampleDataset => {
        return sampleDataset.id === request.params.id;
      });
      if (!sampleDataset) {
        return reply().code(404);
      }

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const index = createIndexName(server, sampleDataset.id);
      const insertCmd = {
        index: {
          _index: index
        }
      };

      // clean up any old installation of dataset
      try {
        await callWithRequest(request, 'indices.delete', { index: index });
      } catch (err) {
        // ignore delete errors
      }

      try {
        const createIndexParams = {
          index: index,
          body: {
            settings: {
              index: {
                number_of_shards: 1,
                number_of_replicas: 0
              }
            },
            mappings: {
              _doc: {
                properties: sampleDataset.fields
              }
            }
          }
        };
        await callWithRequest(request, 'indices.create', createIndexParams);
      } catch (err) {
        const errMsg = `Unable to create sample data index "${index}", error: ${err.message}`;
        server.log(['warning'], errMsg);
        return reply(errMsg).code(err.status);
      }

      const now = new Date();
      const currentTimeMarker = new Date(Date.parse(sampleDataset.currentTimeMarker));
      function updateTimestamps(doc) {
        sampleDataset.timeFields.forEach(timeFieldName => {
          if (doc[timeFieldName]) {
            doc[timeFieldName] = adjustTimestamp(doc[timeFieldName], currentTimeMarker, now, sampleDataset.preserveDayOfWeekTimeOfDay);
          }
        });
        return doc;
      }
      const bulkInsert = async (docs) => {
        const bulk = [];
        docs.forEach(doc => {
          bulk.push(insertCmd);
          bulk.push(updateTimestamps(doc));
        });
        const resp = await callWithRequest(request, 'bulk', { body: bulk });
        if (resp.errors) {
          server.log(
            ['warning'],
            `sample_data install errors while bulk inserting. Elasticsearch response: ${JSON.stringify(resp, null, ' ')}`);
          return Promise.reject(new Error(`Unable to load sample data into index "${index}", see kibana logs for details`));
        }
      };
      loadData(sampleDataset.dataPath, bulkInsert, async (err, count) => {
        if (err) {
          server.log(['warning'], `sample_data install errors while loading data. Error: ${err}`);
          return reply(err.message).code(500);
        }

        const createResults = await request.getSavedObjectsClient().bulkCreate(sampleDataset.savedObjects, { overwrite: true });
        const errors = createResults.filter(savedObjectCreateResult => {
          return savedObjectCreateResult.hasOwnProperty('error');
        });
        if (errors.length > 0) {
          server.log(['warning'], `sample_data install errors while loading saved objects. Errors: ${errors.join(',')}`);
          return reply(`Unable to load kibana saved objects, see kibana logs for details`).code(403);
        }

        return reply({ docsLoaded: count, kibanaSavedObjectsLoaded: sampleDataset.savedObjects.length });
      });
    }
  }
});
