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
 * Source: /oas_docs/output/kibana.yaml, operations: post-streams-name-queries-bulk
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { post_streams_name_queries_bulk_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_STREAMS_NAME_QUERIES_BULK_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_streams_name_queries_bulk',
  summary: `Bulk update queries`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/queries/_bulk</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Bulk update queries of a stream. Can add new queries and delete existing ones.<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['POST'],
  patterns: ['/api/streams/{name}/queries/_bulk'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-streams-name-queries-bulk',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: ['operations'],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_streams_name_queries_bulk_request, 'body'),
    ...getShapeAt(post_streams_name_queries_bulk_request, 'path'),
    ...getShapeAt(post_streams_name_queries_bulk_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
