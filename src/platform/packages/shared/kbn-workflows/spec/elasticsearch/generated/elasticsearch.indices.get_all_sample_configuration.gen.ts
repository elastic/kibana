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
 * Generated at: 2025-11-27T07:04:28.219Z
 * Source: elasticsearch-specification repository, operations:
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import type { InternalConnectorContract } from '../../../types/latest';

// import all needed request and response schemas generated from the OpenAPI spec
import {} from './es_openapi_zod.gen';

// export contract
export const INDICES_GET_ALL_SAMPLE_CONFIGURATION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_all_sample_configuration',
  connectorGroup: 'internal',
  summary: null,
  description: `Get all sampling configurations.

Get the sampling configurations for all indices.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch#TODO`,
  methods: ['GET'],
  patterns: ['_sample/config'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch#TODO',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.object({})),
  outputSchema: z.optional(z.looseObject({})),
};
