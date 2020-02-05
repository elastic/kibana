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

import Hapi from 'hapi';
import Joi from 'joi';
import { SavedObjectsClient, SavedObjectsBulkUpdateObject } from 'src/core/server';
import { Prerequisites } from './types';

interface BulkUpdateRequest extends Hapi.Request {
  pre: {
    savedObjectsClient: SavedObjectsClient;
  };
  payload: SavedObjectsBulkUpdateObject[];
}

export const createBulkUpdateRoute = (prereqs: Prerequisites) => {
  return {
    path: '/api/saved_objects/_bulk_update',
    method: 'PUT',
    config: {
      pre: [prereqs.getSavedObjectsClient],
      validate: {
        payload: Joi.array().items(
          Joi.object({
            type: Joi.string().required(),
            id: Joi.string().required(),
            attributes: Joi.object().required(),
            version: Joi.string(),
            references: Joi.array().items(
              Joi.object().keys({
                name: Joi.string().required(),
                type: Joi.string().required(),
                id: Joi.string().required(),
              })
            ),
          })
        ),
      },
      handler(request: BulkUpdateRequest) {
        const { savedObjectsClient } = request.pre;
        return savedObjectsClient.bulkUpdate(request.payload);
      },
    },
  };
};
