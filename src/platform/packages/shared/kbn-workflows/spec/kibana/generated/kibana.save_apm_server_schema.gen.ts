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
 * Source: /oas_docs/output/kibana.yaml, operations: saveApmServerSchema
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  save_apm_server_schema_request,
  save_apm_server_schema_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const SAVE_APM_SERVER_SCHEMA_CONTRACT: InternalConnectorContract = {
  type: 'kibana.saveApmServerSchema',
  summary: `Save APM server schema`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/apm/fleet/apm_server_schema</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/apm/fleet/apm_server_schema'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-saveapmserverschema',
  parameterTypes: {
    headerParams: ['elastic-api-version', 'kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: ['schema'],
  },
  paramsSchema: z.object({
    ...getShapeAt(save_apm_server_schema_request, 'body'),
    ...getShapeAt(save_apm_server_schema_request, 'path'),
    ...getShapeAt(save_apm_server_schema_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: save_apm_server_schema_response,
};
