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
 * Source: /oas_docs/output/kibana.yaml, operations: delete-streams-name-queries-queryid
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { delete_streams_name_queries_queryid_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const DELETE_STREAMS_NAME_QUERIES_QUERYID_CONTRACT: InternalConnectorContract = {
  type: 'kibana.delete_streams_name_queries_queryid',
  summary: `Remove a query from a stream`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/queries/{queryId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Remove a query from a stream. Noop if the query is not found on the stream.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['DELETE'],
  patterns: ['/api/streams/{name}/queries/{queryId}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete-streams-name-queries-queryid',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name', 'queryId'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(delete_streams_name_queries_queryid_request, 'body'),
    ...getShapeAt(delete_streams_name_queries_queryid_request, 'path'),
    ...getShapeAt(delete_streams_name_queries_queryid_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
