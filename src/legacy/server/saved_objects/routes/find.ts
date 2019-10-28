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
import { SavedObjectsClientContract } from 'src/core/server';
import { Prerequisites, WithoutQueryAndParams } from './types';

interface FindRequest extends WithoutQueryAndParams<Hapi.Request> {
  pre: {
    savedObjectsClient: SavedObjectsClientContract;
  };
  query: {
    per_page: number;
    page: number;
    type: string[];
    search?: string;
    default_search_operator: 'AND' | 'OR';
    search_fields?: string[];
    sort_field?: string;
    has_reference?: {
      type: string;
      id: string;
    };
    fields?: string[];
    filter?: string;
  };
}

export const createFindRoute = (prereqs: Prerequisites) => ({
  path: '/api/saved_objects/_find',
  method: 'GET',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      query: Joi.object()
        .keys({
          per_page: Joi.number()
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
          default_search_operator: Joi.string()
            .valid('OR', 'AND')
            .default('OR'),
          search_fields: Joi.array()
            .items(Joi.string())
            .single(),
          sort_field: Joi.string(),
          has_reference: Joi.object()
            .keys({
              type: Joi.string().required(),
              id: Joi.string().required(),
            })
            .optional(),
          fields: Joi.array()
            .items(Joi.string())
            .single(),
          filter: Joi.string()
            .allow('')
            .optional(),
        })
        .default(),
    },
    handler(request: FindRequest) {
      const query = request.query;
      return request.pre.savedObjectsClient.find({
        perPage: query.per_page,
        page: query.page,
        type: query.type,
        search: query.search,
        defaultSearchOperator: query.default_search_operator,
        searchFields: query.search_fields,
        sortField: query.sort_field,
        hasReference: query.has_reference,
        fields: query.fields,
        filter: query.filter,
      });
    },
  },
});
