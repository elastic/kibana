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

import _ from 'lodash';
import Joi from 'joi';
import { usage } from '../usage';
import { createIndexName } from './lib/create_index_name';

export const createUninstallRoute = () => ({
  path: '/api/sample_data/{id}',
  method: 'DELETE',
  config: {
    validate: {
      params: Joi.object()
        .keys({
          id: Joi.string().required(),
        })
        .required(),
    },
    handler: async (request, h) => {
      const { server, params } = request;
      const sampleDataset = server.getSampleDatasets().find(({ id }) => id === params.id);

      if (!sampleDataset) {
        return h.response().code(404);
      }

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

      for (let i = 0; i < sampleDataset.dataIndices.length; i++) {
        const dataIndexConfig = sampleDataset.dataIndices[i];
        const index = createIndexName(sampleDataset.id, dataIndexConfig.id);

        try {
          await callWithRequest(request, 'indices.delete', { index: index });
        } catch (err) {
          return h
            .response(`Unable to delete sample data index "${index}", error: ${err.message}`)
            .code(err.status);
        }
      }

      const deletePromises = sampleDataset.savedObjects.map(({ type, id }) =>
        request.getSavedObjectsClient().delete(type, id)
      );

      try {
        await Promise.all(deletePromises);
      } catch (err) {
        // ignore 404s since users could have deleted some of the saved objects via the UI
        if (_.get(err, 'output.statusCode') !== 404) {
          return h
            .response(`Unable to delete sample dataset saved objects, error: ${err.message}`)
            .code(403);
        }
      }

      // track the usage operation in a non-blocking way
      usage(request).addUninstall(params.id);

      return {};
    },
  },
});
