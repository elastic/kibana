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
 * Source: /oas_docs/output/kibana.yaml, operations: ReadExceptionList
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  read_exception_list_request,
  read_exception_list_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const READ_EXCEPTION_LIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadExceptionList',
  summary: `Get exception list details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of an exception list using the \`id\` or \`list_id\` field.`,
  methods: ['GET'],
  patterns: ['/api/exception_lists'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readexceptionlist',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'list_id', 'namespace_type'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(read_exception_list_request, 'body'),
    ...getShapeAt(read_exception_list_request, 'path'),
    ...getShapeAt(read_exception_list_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: read_exception_list_response,
};
