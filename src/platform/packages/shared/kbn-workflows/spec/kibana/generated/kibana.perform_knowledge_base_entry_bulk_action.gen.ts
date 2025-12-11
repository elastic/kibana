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
 * Source: /oas_docs/output/kibana.yaml, operations: PerformKnowledgeBaseEntryBulkAction
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  perform_knowledge_base_entry_bulk_action_request,
  perform_knowledge_base_entry_bulk_action_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PERFORM_KNOWLEDGE_BASE_ENTRY_BULK_ACTION_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PerformKnowledgeBaseEntryBulkAction',
  summary: `Applies a bulk action to multiple Knowledge Base Entries`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/_bulk_action</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

The bulk action is applied to all Knowledge Base Entries that match the filter or to the list of Knowledge Base Entries by their IDs.`,
  methods: ['POST'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/_bulk_action'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-performknowledgebaseentrybulkaction',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['create', 'delete', 'update'],
  },
  paramsSchema: z.object({
    ...getShapeAt(perform_knowledge_base_entry_bulk_action_request, 'body'),
    ...getShapeAt(perform_knowledge_base_entry_bulk_action_request, 'path'),
    ...getShapeAt(perform_knowledge_base_entry_bulk_action_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: perform_knowledge_base_entry_bulk_action_response,
};
