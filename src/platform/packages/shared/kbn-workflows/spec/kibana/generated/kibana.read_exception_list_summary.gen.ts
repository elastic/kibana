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
 * Source: /oas_docs/output/kibana.yaml, operations: ReadExceptionListSummary
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  read_exception_list_summary_request,
  read_exception_list_summary_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const READ_EXCEPTION_LIST_SUMMARY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadExceptionListSummary',
  summary: `Get an exception list summary`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/summary</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a summary of the specified exception list.`,
  methods: ['GET'],
  patterns: ['/api/exception_lists/summary'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readexceptionlistsummary',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'list_id', 'namespace_type', 'filter'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(read_exception_list_summary_request, 'body'),
    ...getShapeAt(read_exception_list_summary_request, 'path'),
    ...getShapeAt(read_exception_list_summary_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: read_exception_list_summary_response,
};
