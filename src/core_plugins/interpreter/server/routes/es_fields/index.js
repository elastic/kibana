/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { partial } from 'lodash';
import { getESFieldTypes } from './get_es_field_types';

// TODO: Error handling, note: esErrors
export function esFields(server) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

  server.route({
    method: 'GET',
    path: '/api/canvas/es_fields',
    handler: function(request, reply) {
      const { index, fields } = request.query;
      if (!index) return reply({ error: '"index" query is required' }).code(400);

      reply(getESFieldTypes(index, fields, partial(callWithRequest, request)));
    },
  });
}
