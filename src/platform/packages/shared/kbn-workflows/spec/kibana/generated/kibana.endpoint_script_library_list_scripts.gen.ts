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
 * Source: /oas_docs/output/kibana.yaml, operations: EndpointScriptLibraryListScripts
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  endpoint_script_library_list_scripts_request,
  endpoint_script_library_list_scripts_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const ENDPOINT_SCRIPT_LIBRARY_LIST_SCRIPTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EndpointScriptLibraryListScripts',
  summary: `Get a list of scripts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/endpoint/scripts_library</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a list of scripts`,
  methods: ['GET'],
  patterns: ['/api/endpoint/scripts_library'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-endpointscriptlibrarylistscripts',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['page', 'pageSize', 'sortField', 'sortDirection', 'kuery'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(endpoint_script_library_list_scripts_request, 'body'),
    ...getShapeAt(endpoint_script_library_list_scripts_request, 'path'),
    ...getShapeAt(endpoint_script_library_list_scripts_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: endpoint_script_library_list_scripts_response,
};
