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
import path from 'path';
import wreck from 'wreck';
import { toArray } from 'rxjs/operators';
import { collectUiExports } from '../../../../../../../ui/ui_exports';
import { injectMetaAttributes } from '../../../../lib/management/saved_objects/inject_meta_attributes';
import { findPluginSpecs } from '../../../../../../../plugin_discovery';

async function getKibanaPluginEnabled({ pluginId, kibanaUrl }) {
  try {
    const { payload } = await wreck.get('/api/status', {
      baseUrl: kibanaUrl,
      json: true
    });

    return payload.status.statuses
      .some(({ id }) => id.includes(`plugin:${pluginId}@`));
  } catch (error) {
    throw new Error(`Unable to fetch Kibana status API response from Kibana at ${kibanaUrl}: ${error}`);
  }
}

async function getUiExports(kibanaUrl) {
  const xpackEnabled = await getKibanaPluginEnabled({
    kibanaUrl,
    pluginId: 'xpack_main'
  });

  const { spec$ } = await findPluginSpecs({
    plugins: {
      scanDirs: [path.resolve(__dirname, '../../../../../../')],
      paths: xpackEnabled ? [path.resolve(__dirname, '../../../../../../../../../x-pack')] : [],
    }
  });

  const specs = await spec$.pipe(toArray()).toPromise();
  return collectUiExports(specs);
}

export function registerFind(server) {
  server.route({
    path: '/api/kibana/management/saved_objects/_find',
    method: 'GET',
    config: {
      validate: {
        query: Joi.object()
          .keys({
            perPage: Joi.number()
              .min(0)
              .default(20),
            page: Joi.number()
              .min(0)
              .default(1),
            type: Joi.array()
              .items(Joi.string())
              .single()
              .required(),
            search: Joi.string()
              .allow('')
              .optional(),
            defaultSearchOperator: Joi.string()
              .valid('OR', 'AND')
              .default('OR'),
            searchFields: Joi.array()
              .items(Joi.string())
              .single(),
            sortField: Joi.string(),
            hasReference: Joi.object()
              .keys({
                type: Joi.string().required(),
                id: Joi.string().required(),
              })
              .optional(),
            fields: Joi.array()
              .items(Joi.string())
              .single(),
          })
          .default(),
      },
    },
    async handler(request) {
      const searchFields = new Set();
      const { savedObjectSchemas } = request.server.kibanaMigrator.kbnServer.uiExports;
      const savedObjectsClient = request.getSavedObjectsClient();
      const fieldsFilter = request.query.fields;

      for (const schema of Object.values(savedObjectSchemas)) {
        if (schema.titleSearchField) {
          searchFields.add(schema.titleSearchField);
        }
      }

      const findResponse = await savedObjectsClient.find({
        ...request.query,
        fields: undefined,
        searchFields: [...searchFields],
      });
      return {
        ...findResponse,
        saved_objects: injectMetaAttributes(findResponse.saved_objects, savedObjectSchemas).map((obj) => {
          if (!fieldsFilter) {
            return obj;
          }
          const attributes = {};
          for (const field of fieldsFilter) {
            attributes[field] = obj.attributes[field];
          }
          return {
            ...obj,
            attributes,
          };
        })
      };
    },
  });
}
