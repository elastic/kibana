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
 * Source: /oas_docs/output/kibana.yaml, operations: ReadKnowledgeBase
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  read_knowledge_base_request,
  read_knowledge_base_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const READ_KNOWLEDGE_BASE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadKnowledgeBase',
  summary: `Read a KnowledgeBase for a resource`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/security_ai_assistant/knowledge_base/{resource}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Read a knowledge base with a specific resource identifier.`,
  methods: ['GET'],
  patterns: ['/api/security_ai_assistant/knowledge_base/{resource}'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readknowledgebase',
  parameterTypes: {
    headerParams: [],
    pathParams: ['resource'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(read_knowledge_base_request, 'body'),
    ...getShapeAt(read_knowledge_base_request, 'path'),
    ...getShapeAt(read_knowledge_base_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: read_knowledge_base_response,
};
