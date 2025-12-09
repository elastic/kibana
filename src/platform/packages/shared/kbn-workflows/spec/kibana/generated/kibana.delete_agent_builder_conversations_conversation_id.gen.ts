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
 * Source: /oas_docs/output/kibana.yaml, operations: delete-agent-builder-conversations-conversation-id
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { delete_agent_builder_conversations_conversation_id_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const DELETE_AGENT_BUILDER_CONVERSATIONS_CONVERSATION_ID_CONTRACT: InternalConnectorContract =
  {
    type: 'kibana.delete_agent_builder_conversations_conversation_id',
    summary: `Delete conversation by ID`,
    description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/conversations/{conversation_id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete a conversation by ID. This action cannot be undone.<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
    methods: ['DELETE'],
    patterns: ['/api/agent_builder/conversations/{conversation_id}'],
    documentation:
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-delete-agent-builder-conversations-conversation-id',
    parameterTypes: {
      headerParams: ['kbn-xsrf'],
      pathParams: ['conversation_id'],
      urlParams: [],
      bodyParams: [],
    },
    paramsSchema: z.object({
      ...getShapeAt(delete_agent_builder_conversations_conversation_id_request, 'body'),
      ...getShapeAt(delete_agent_builder_conversations_conversation_id_request, 'path'),
      ...getShapeAt(delete_agent_builder_conversations_conversation_id_request, 'query'),
      fetcher: FetcherConfigSchema,
    }),
    outputSchema: z.optional(z.looseObject({})),
  };
