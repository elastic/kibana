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
import { SavedObjectAttributes, SavedObjectsClientContract } from 'src/core/server';
import { Prerequisites, SavedObjectReference, WithoutQueryAndParams } from './types';

interface SavedObject {
  type: string;
  id?: string;
  attributes: SavedObjectAttributes;
  version?: string;
  migrationVersion?: { [key: string]: string };
  references: SavedObjectReference[];
}

interface BulkCreateRequest extends WithoutQueryAndParams<Hapi.Request> {
  pre: {
    savedObjectsClient: SavedObjectsClientContract;
  };
  query: {
    overwrite: boolean;
  };
  payload: SavedObject[];
}

export const createBulkCreateRoute = (prereqs: Prerequisites) => ({
  path: '/api/saved_objects/_bulk_create',
  method: 'POST',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      query: Joi.object()
        .keys({
          overwrite: Joi.boolean().default(false),
        })
        .default(),
      payload: Joi.array().items(
        Joi.object({
          type: Joi.string().required(),
          id: Joi.string(),
          attributes: Joi.object().required(),
          version: Joi.string(),
          migrationVersion: Joi.object().optional(),
          references: Joi.array()
            .items(
              Joi.object().keys({
                name: Joi.string().required(),
                type: Joi.string().required(),
                id: Joi.string().required(),
              })
            )
            .default([]),
        }).required()
      ),
    },
    handler(request: BulkCreateRequest) {
      const { overwrite } = request.query;
      const { savedObjectsClient } = request.pre;

      return savedObjectsClient.bulkCreate(request.payload, { overwrite });
    },
  },
});
