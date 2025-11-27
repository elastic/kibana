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
 * Generated at: 2025-11-27T07:43:24.892Z
 * Source: elasticsearch-specification repository, operations: ingest-processor-grok
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ingest_processor_grok_request,
  ingest_processor_grok_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INGEST_PROCESSOR_GROK_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.processor_grok',
  connectorGroup: 'internal',
  summary: `Run a grok processor`,
  description: `Run a grok processor.

Extract structured fields out of a single text field within a document.
You must choose which field to extract matched fields from, as well as the grok pattern you expect will match.
A grok pattern is like a regular expression that supports aliased expressions that can be reused.

 Documentation: https://www.elastic.co/docs/reference/enrich-processor/grok-processor`,
  methods: ['GET'],
  patterns: ['_ingest/processor/grok'],
  documentation: 'https://www.elastic.co/docs/reference/enrich-processor/grok-processor',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ingest_processor_grok_request, 'body'),
    ...getShapeAt(ingest_processor_grok_request, 'path'),
    ...getShapeAt(ingest_processor_grok_request, 'query'),
  }),
  outputSchema: ingest_processor_grok_response,
};
