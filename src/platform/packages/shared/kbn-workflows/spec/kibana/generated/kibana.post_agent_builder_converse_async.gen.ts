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
 * Source: /oas_docs/output/kibana.yaml, operations: post-agent-builder-converse-async
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { post_agent_builder_converse_async_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const POST_AGENT_BUILDER_CONVERSE_ASYNC_CONTRACT: InternalConnectorContract = {
  type: 'kibana.post_agent_builder_converse_async',
  summary: `Send chat message (streaming)`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/agent_builder/converse/async</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Send a message to an agent and receive real-time streaming events. This asynchronous endpoint provides live updates as the agent processes your request, allowing you to see intermediate steps and progress. Use this for interactive experiences where you want to monitor the agent's thinking process.

## Event types

The endpoint emits Server-Sent Events (SSE) with the following custom event types:

\`conversation_id_set\`

Sets the conversation ID.

Schema:
\`\`\`json
{
  "conversation_id": "uuid"
}
\`\`\`

---

\`conversation_created\`

Fires when a new conversation is persisted and assigned an ID.

Schema:
\`\`\`json
{
  "conversation_id": "uuid",
  "title": "conversation title"
}
\`\`\`

---

\`conversation_updated\`

Fires when a conversation is updated.

Schema:
\`\`\`json
{
  "conversation_id": "uuid",
  "title": "updated conversation title"
}
\`\`\`

---

\`reasoning\`

Handles reasoning-related data.

Schema:
\`\`\`json
{
  "reasoning": "plain text reasoning content",
  "transient": false
}
\`\`\`

---

\`tool_call\`

Triggers when a tool is invoked.

Schema:
\`\`\`json
{
  "tool_call_id": "uuid",
  "tool_id": "tool_name",
  "params": {}
}
\`\`\`

---

\`tool_progress\`

Reports progress of a running tool.

Schema:
\`\`\`json
{
  "tool_call_id": "uuid",
  "message": "progress message"
}
\`\`\`

---

\`tool_result\`

Returns results from a completed tool call.

Schema:
\`\`\`json
{
  "tool_call_id": "uuid",
  "tool_id": "tool_name",
  "results": []
}
\`\`\`

**Note:** \`results\` is an array of \`ToolResult\` objects.

---

\`message_chunk\`

Streams partial text chunks.

Schema:
\`\`\`json
{
  "message_id": "uuid",
  "text_chunk": "partial text"
}
\`\`\`

---

\`message_complete\`

Indicates message stream is finished.

Schema:
\`\`\`json
{
  "message_id": "uuid",
  "message_content": "full text content of the message"
}
\`\`\`

---

\`thinking_complete\`

Marks the end of the thinking/reasoning phase.

Schema:
\`\`\`json
{
  "time_to_first_token": 0
}
\`\`\`

**Note:** \`time_to_first_token\` is in milliseconds.

---

\`round_complete\`

Marks end of one conversation round.

Schema:
\`\`\`json
{
  "round": {}
}
\`\`\`

**Note:** \`round\` contains the full round json object.

---

## Event flow

A typical conversation round emits events in this sequence:

1. \`reasoning\` (potentially multiple, some transient)
2. \`tool_call\` (if tools are used)
3. \`tool_progress\` (zero or more progress updates)
4. \`tool_result\` (when tool completes)
5. \`thinking_complete\`
6. \`message_chunk\` (multiple, as text streams)
7. \`message_complete\`
8. \`round_complete\`<br/><br/>[Required authorization] Route required privileges: read_onechat.`,
  methods: ['POST'],
  patterns: ['/api/agent_builder/converse/async'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-converse-async',
  parameterTypes: {
    headerParams: ['kbn-xsrf'],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'agent_id',
      'attachments',
      'browser_api_tools',
      'capabilities',
      'connector_id',
      'conversation_id',
      'input',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(post_agent_builder_converse_async_request, 'body'),
    ...getShapeAt(post_agent_builder_converse_async_request, 'path'),
    ...getShapeAt(post_agent_builder_converse_async_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
