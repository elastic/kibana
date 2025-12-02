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
 * Source: /oas_docs/output/kibana.yaml, operations: FindAnonymizationFields
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  find_anonymization_fields_request,
  find_anonymization_fields_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const FIND_ANONYMIZATION_FIELDS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindAnonymizationFields',
  summary: `Get anonymization fields`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/anonymization_fields/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all anonymization fields.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/anonymization_fields/_find'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findanonymizationfields',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['fields', 'filter', 'sort_field', 'sort_order', 'page', 'per_page', 'all_data'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(find_anonymization_fields_request, 'body'),
    ...getShapeAt(find_anonymization_fields_request, 'path'),
    ...getShapeAt(find_anonymization_fields_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: find_anonymization_fields_response,
};
