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
 * Source: /oas_docs/output/kibana.yaml, operations: ExportExceptionList
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { export_exception_list_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const EXPORT_EXCEPTION_LIST_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ExportExceptionList',
  summary: `Export an exception list`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/exception_lists/_export</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Export an exception list and its associated items to an NDJSON file.`,
  methods: ['POST'],
  patterns: ['/api/exception_lists/_export'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-exportexceptionlist',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['id', 'list_id', 'namespace_type', 'include_expired_exceptions'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(export_exception_list_request, 'body'),
    ...getShapeAt(export_exception_list_request, 'path'),
    ...getShapeAt(export_exception_list_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
