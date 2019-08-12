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
import { IndexPatternsService } from '../service';

interface FieldsForTimePatternRequest extends Hapi.Request {
  pre: {
    indexPatterns: IndexPatternsService;
  };
  query: {
    pattern: string;
    interval: string;
    look_back: number;
    meta_fields: string[];
  };
}

interface Prerequisites {
  getIndexPatternsService: Hapi.RouteOptionsPreAllOptions;
}

export const createFieldsForTimePatternRoute = (pre: Prerequisites) => ({
  path: '/api/index_patterns/_fields_for_time_pattern',
  method: 'GET',
  config: {
    pre: [pre.getIndexPatternsService],
    validate: {
      query: Joi.object()
        .keys({
          pattern: Joi.string().required(),
          look_back: Joi.number()
            .min(1)
            .required(),
          meta_fields: Joi.array()
            .items(Joi.string())
            .default([]),
        })
        .default(),
    },
    async handler(req: FieldsForTimePatternRequest) {
      const { indexPatterns } = req.pre;
      const { pattern, interval, look_back: lookBack, meta_fields: metaFields } = req.query;

      const fields = await indexPatterns.getFieldsForTimePattern({
        pattern,
        interval,
        lookBack,
        metaFields,
      });

      return { fields };
    },
  },
});
