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
import { keysToCamelCaseShallow } from '../../../utils/case_conversion';

export const createFindRoute = (prereqs) => ({
  path: '/api/saved_objects/_find',
  method: 'GET',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      query: Joi.object().keys({
        per_page: Joi.number().min(0).default(20),
        page: Joi.number().min(0).default(1),
        type: Joi.array().items(Joi.string()).single().required(),
        search: Joi.string().allow('').optional(),
        search_fields: Joi.array().items(Joi.string()).single(),
        sort_field: Joi.array().items(Joi.string()).single(),
        fields: Joi.array().items(Joi.string()).single()
      }).default()
    },
    handler(request, reply) {
      const options = keysToCamelCaseShallow(request.query);
      reply(request.pre.savedObjectsClient.find(options));
    }
  }
});
