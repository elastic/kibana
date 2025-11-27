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
 * Generated at: 2025-11-27T07:04:28.254Z
 * Source: elasticsearch-specification repository, operations: simulate-ingest, simulate-ingest-1, simulate-ingest-2, simulate-ingest-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  simulate_ingest1_request,
  simulate_ingest1_response,
  simulate_ingest2_request,
  simulate_ingest2_response,
  simulate_ingest3_request,
  simulate_ingest3_response,
  simulate_ingest_request,
  simulate_ingest_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SIMULATE_INGEST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.simulate.ingest',
  connectorGroup: 'internal',
  summary: `Simulate data ingestion`,
  description: `Simulate data ingestion.

Run ingest pipelines against a set of provided documents, optionally with substitute pipeline definitions, to simulate ingesting data into an index.

This API is meant to be used for troubleshooting or pipeline development, as it does not actually index any data into Elasticsearch.

The API runs the default and final pipeline for that index against a set of documents provided in the body of the request.
If a pipeline contains a reroute processor, it follows that reroute processor to the new index, running that index's pipelines as well the same way that a non-simulated ingest would.
No data is indexed into Elasticsearch.
Instead, the transformed document is returned, along with the list of pipelines that have been run and the name of the index where the document would have been indexed if this were not a simulation.
The transformed document is validated against the mappings that would apply to this index, and any validation error is reported in the result.

This API differs from the simulate pipeline API in that you specify a single pipeline for that API, and it runs only that one pipeline.
The simulate pipeline API is more useful for developing a single pipeline, while the simulate ingest API is more useful for troubleshooting the interaction of the various pipelines that get applied when ingesting into an index.

By default, the pipeline definitions that are currently in the system are used.
However, you can supply substitute pipeline definitions in the body of the request.
These will be used in place of the pipeline definitions that are already in the system. This can be used to replace existing pipeline definitions or to create new ones. The pipeline substitutions are used only within this request.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-simulate-ingest`,
  methods: ['GET', 'POST'],
  patterns: ['_ingest/_simulate', '_ingest/{index}/_simulate'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-simulate-ingest',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['pipeline', 'merge_type'],
    bodyParams: [
      'docs',
      'component_template_substitutions',
      'index_template_substitutions',
      'mapping_addition',
      'pipeline_substitutions',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(simulate_ingest_request, 'body'),
      ...getShapeAt(simulate_ingest_request, 'path'),
      ...getShapeAt(simulate_ingest_request, 'query'),
    }),
    z.object({
      ...getShapeAt(simulate_ingest1_request, 'body'),
      ...getShapeAt(simulate_ingest1_request, 'path'),
      ...getShapeAt(simulate_ingest1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(simulate_ingest2_request, 'body'),
      ...getShapeAt(simulate_ingest2_request, 'path'),
      ...getShapeAt(simulate_ingest2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(simulate_ingest3_request, 'body'),
      ...getShapeAt(simulate_ingest3_request, 'path'),
      ...getShapeAt(simulate_ingest3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    simulate_ingest_response,
    simulate_ingest1_response,
    simulate_ingest2_response,
    simulate_ingest3_response,
  ]),
};
