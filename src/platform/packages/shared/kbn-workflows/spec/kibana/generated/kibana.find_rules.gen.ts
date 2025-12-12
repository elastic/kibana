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
 * Source: /oas_docs/output/kibana.yaml, operations: FindRules
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { find_rules_request, find_rules_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const FIND_RULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.FindRules',
  summary: `List all detection rules`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/_find</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve a paginated list of detection rules. By default, the first page is returned, with 20 results per page.`,
  methods: ['GET'],
  patterns: ['/api/detection_engine/rules/_find'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-findrules',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'fields',
      'filter',
      'sort_field',
      'sort_order',
      'page',
      'per_page',
      'gaps_range_start',
      'gaps_range_end',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(find_rules_request, 'body'),
    ...getShapeAt(find_rules_request, 'path'),
    ...getShapeAt(find_rules_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: find_rules_response,
};
