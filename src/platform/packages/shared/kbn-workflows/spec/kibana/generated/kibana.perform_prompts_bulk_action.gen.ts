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
 * Source: /oas_docs/output/kibana.yaml, operations: PerformPromptsBulkAction
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  perform_prompts_bulk_action_request,
  perform_prompts_bulk_action_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PERFORM_PROMPTS_BULK_ACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PerformPromptsBulkAction',
  summary: `Apply a bulk action to prompts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/prompts/_bulk_action</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Apply a bulk action to multiple prompts. The bulk action is applied to all prompts that match the filter or to the list of prompts by their IDs. This action allows for bulk create, update, or delete operations.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/prompts/_bulk_action'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-performpromptsbulkaction',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['create', 'delete', 'update'],
  },
  paramsSchema: z.object({
    ...getShapeAt(perform_prompts_bulk_action_request, 'body'),
    ...getShapeAt(perform_prompts_bulk_action_request, 'path'),
    ...getShapeAt(perform_prompts_bulk_action_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: perform_prompts_bulk_action_response,
};
