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
 * Source: elasticsearch-specification repository, operations: graph-explore, graph-explore-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  graph_explore1_request,
  graph_explore1_response,
  graph_explore_request,
  graph_explore_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const GRAPH_EXPLORE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.graph.explore',
  summary: `Explore graph analytics`,
  description: `Explore graph analytics.

Extract and summarize information about the documents and terms in an Elasticsearch data stream or index.
The easiest way to understand the behavior of this API is to use the Graph UI to explore connections.
An initial request to the \`_explore\` API contains a seed query that identifies the documents of interest and specifies the fields that define the vertices and connections you want to include in the graph.
Subsequent requests enable you to spider out from one more vertices of interest.
You can exclude vertices that have already been returned.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-graph`,
  methods: ['GET', 'POST'],
  patterns: ['{index}/_graph/explore'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-graph',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['routing', 'timeout'],
    bodyParams: ['connections', 'controls', 'query', 'vertices'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(graph_explore_request, 'body'),
      ...getShapeAt(graph_explore_request, 'path'),
      ...getShapeAt(graph_explore_request, 'query'),
    }),
    z.object({
      ...getShapeAt(graph_explore1_request, 'body'),
      ...getShapeAt(graph_explore1_request, 'path'),
      ...getShapeAt(graph_explore1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([graph_explore_response, graph_explore1_response]),
};
