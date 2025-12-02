/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * Source: elasticsearch-specification repository, operations: cat-circuit-breaker, cat-circuit-breaker-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_circuit_breaker1_request,
  cat_circuit_breaker1_response,
  cat_circuit_breaker_request,
  cat_circuit_breaker_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_CIRCUIT_BREAKER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.circuit_breaker',
  summary: `Get circuit breakers statistics`,
  description: `Get circuit breakers statistics.


IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch#TODO`,
  methods: ['GET'],
  patterns: ['_cat/circuit_breaker', '_cat/circuit_breaker/{circuit_breaker_patterns}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch#TODO',
  parameterTypes: {
    headerParams: [],
    pathParams: ['circuit_breaker_patterns'],
    urlParams: ['h', 's', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_circuit_breaker_request, 'body'),
      ...getShapeAt(cat_circuit_breaker_request, 'path'),
      ...getShapeAt(cat_circuit_breaker_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_circuit_breaker1_request, 'body'),
      ...getShapeAt(cat_circuit_breaker1_request, 'path'),
      ...getShapeAt(cat_circuit_breaker1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cat_circuit_breaker_response, cat_circuit_breaker1_response]),
};
