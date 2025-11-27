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
 * Generated at: 2025-11-27T07:04:28.231Z
 * Source: elasticsearch-specification repository, operations: ingest-simulate, ingest-simulate-1, ingest-simulate-2, ingest-simulate-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ingest_simulate1_request,
  ingest_simulate1_response,
  ingest_simulate2_request,
  ingest_simulate2_response,
  ingest_simulate3_request,
  ingest_simulate3_response,
  ingest_simulate_request,
  ingest_simulate_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INGEST_SIMULATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.simulate',
  connectorGroup: 'internal',
  summary: `Simulate a pipeline`,
  description: `Simulate a pipeline.

Run an ingest pipeline against a set of provided documents.
You can either specify an existing pipeline to use with the provided documents or supply a pipeline definition in the body of the request.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-simulate`,
  methods: ['GET', 'POST'],
  patterns: ['_ingest/pipeline/_simulate', '_ingest/pipeline/{id}/_simulate'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-simulate',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['verbose'],
    bodyParams: ['docs', 'pipeline'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ingest_simulate_request, 'body'),
      ...getShapeAt(ingest_simulate_request, 'path'),
      ...getShapeAt(ingest_simulate_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ingest_simulate1_request, 'body'),
      ...getShapeAt(ingest_simulate1_request, 'path'),
      ...getShapeAt(ingest_simulate1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ingest_simulate2_request, 'body'),
      ...getShapeAt(ingest_simulate2_request, 'path'),
      ...getShapeAt(ingest_simulate2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ingest_simulate3_request, 'body'),
      ...getShapeAt(ingest_simulate3_request, 'path'),
      ...getShapeAt(ingest_simulate3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    ingest_simulate_response,
    ingest_simulate1_response,
    ingest_simulate2_response,
    ingest_simulate3_response,
  ]),
};
