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
 * Source: /oas_docs/output/kibana.yaml, operations: put-streams-name-ingest
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { put_streams_name_ingest_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PUT_STREAMS_NAME_INGEST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.put_streams_name_ingest',
  summary: `Update ingest stream settings`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/streams/{name}/_ingest</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Upserts the ingest settings of an ingest stream definition<br/><br/>[Required authorization] Route required privileges: manage_stream.`,
  methods: ['PUT'],
  patterns: ['/api/streams/{name}/_ingest'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put-streams-name-ingest',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: ['ingest'],
  },
  paramsSchema: z.object({
    ...getShapeAt(put_streams_name_ingest_request, 'body'),
    ...getShapeAt(put_streams_name_ingest_request, 'path'),
    ...getShapeAt(put_streams_name_ingest_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
