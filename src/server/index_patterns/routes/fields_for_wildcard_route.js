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

export const createFieldsForWildcardRoute = pre => ({
  path: '/api/index_patterns/_fields_for_wildcard',
  method: 'GET',
  config: {
    pre: [pre.getIndexPatternsService],
    validate: {
      query: Joi.object().keys({
        pattern: Joi.string().required(),
        meta_fields: Joi.array().items(Joi.string()).default([]),
        params: Joi.object(),
      }).default()
    },
    handler(req, reply) {
      const { indexPatterns } = req.pre;
      const {
        pattern,
        meta_fields: metaFields,
      } = req.query;

      reply(
        indexPatterns.getFieldsForWildcard({
          pattern,
          metaFields
        })
          .then(fields => ({ fields }))
      );
    }
  }
});
