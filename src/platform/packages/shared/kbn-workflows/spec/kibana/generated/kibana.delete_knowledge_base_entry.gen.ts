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
 * Source: /oas_docs/output/kibana.yaml, operations: DeleteKnowledgeBaseEntry
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  delete_knowledge_base_entry_request,
  delete_knowledge_base_entry_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const DELETE_KNOWLEDGE_BASE_ENTRY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteKnowledgeBaseEntry',
  summary: `Deletes a single Knowledge Base Entry using the \`id\` field`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a Knowledge Base Entry by its unique \`id\`.`,
  methods: ['DELETE'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deleteknowledgebaseentry',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(delete_knowledge_base_entry_request, 'body'),
    ...getShapeAt(delete_knowledge_base_entry_request, 'path'),
    ...getShapeAt(delete_knowledge_base_entry_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: delete_knowledge_base_entry_response,
};
