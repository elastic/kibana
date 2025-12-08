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
 * Source: /oas_docs/output/kibana.yaml, operations: UpdateKnowledgeBaseEntry
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  update_knowledge_base_entry_request,
  update_knowledge_base_entry_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const UPDATE_KNOWLEDGE_BASE_ENTRY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateKnowledgeBaseEntry',
  summary: `Update a Knowledge Base Entry`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/entries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing Knowledge Base Entry by its unique \`id\`.`,
  methods: ['PUT'],
  patterns: ['/api/security_ai_assistant/knowledge_base/entries/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updateknowledgebaseentry',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(update_knowledge_base_entry_request, 'body'),
    ...getShapeAt(update_knowledge_base_entry_request, 'path'),
    ...getShapeAt(update_knowledge_base_entry_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: update_knowledge_base_entry_response,
};
