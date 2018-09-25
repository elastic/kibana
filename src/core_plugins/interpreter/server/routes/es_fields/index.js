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

import { partial } from 'lodash';
import { getESFieldTypes } from './get_es_field_types';

// TODO: Error handling, note: esErrors
export function esFields(server) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

  server.route({
    method: 'GET',
    path: '/api/canvas/es_fields',
    handler: function (request, reply) {
      const { index, fields } = request.query;
      if (!index) return reply({ error: '"index" query is required' }).code(400);

      reply(getESFieldTypes(index, fields, partial(callWithRequest, request)));
    },
  });
}
