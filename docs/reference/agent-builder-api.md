# Kibana Agent Builder API Reference

All public Agent Builder API routes live under the `/api/agent_builder` base path and require the **versioned API header**:

```
elastic-api-version: 2023-10-31
```

Authentication uses Kibana's standard session or API key mechanism. Every request must include the appropriate `Authorization` header or session cookie. Write operations also require the `kbn-xsrf` header unless explicitly noted otherwise.

---

## Table of Contents

- [Agents](#agents)
- [Chat (Converse)](#chat-converse)
- [Conversations](#conversations)
- [Attachments](#attachments)
- [Tools](#tools)
- [Skills](#skills)
- [Plugins](#plugins)
- [Consumption](#consumption)
- [MCP Server](#mcp-server)
- [A2A (Agent-to-Agent)](#a2a-agent-to-agent)
- [Authorization & Privileges](#authorization--privileges)
- [Error Handling](#error-handling)

---

## Agents

Manage agent definitions — create, read, update, and delete custom AI agents.

### List agents

Retrieve all available agents including their configuration and assigned tools.

```
GET /api/agent_builder/agents
```

**Required privilege:** `agentBuilder:read`

**Request:** No parameters required.

**Response:**

```json
{
  "results": [
    {
      "id": "my-security-agent",
      "name": "Security Analyst",
      "description": "An agent specialized in security event analysis",
      "avatar_color": "#FF5733",
      "avatar_symbol": "SA",
      "labels": ["security", "analysis"],
      "visibility": "shared",
      "configuration": {
        "instructions": "You are a security analyst. Focus on threat detection and incident response.",
        "tools": [
          { "tool_ids": ["esql.security-events", "index_search.alerts"] }
        ],
        "skill_ids": ["threat-analysis"],
        "enable_elastic_capabilities": true,
        "workflow_ids": [],
        "plugin_ids": []
      }
    }
  ]
}
```

**Example (cURL):**

```bash
curl -s -X GET "https://localhost:5601/api/agent_builder/agents" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>"
```

---

### Get agent by ID

Retrieve a specific agent by its unique identifier.

```
GET /api/agent_builder/agents/{id}
```

**Required privilege:** `agentBuilder:read`

**Path parameters:**

| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| `id`      | string | Unique identifier of the agent |

**Response:** A single `AgentDefinition` object (same shape as individual items in the list response).

**Example:**

```bash
curl -s -X GET "https://localhost:5601/api/agent_builder/agents/my-security-agent" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>"
```

---

### Create an agent

Create a new agent with specified behavior, appearance, and tool configuration.

```
POST /api/agent_builder/agents
```

**Required privilege:** `agentBuilder:manageAgents`

**Request body:**

| Field                                       | Type     | Required | Description                                                                                                                        |
|---------------------------------------------|----------|----------|------------------------------------------------------------------------------------------------------------------------------------|
| `id`                                        | string   | Yes      | Unique identifier for the agent                                                                                                    |
| `name`                                      | string   | Yes      | Display name                                                                                                                       |
| `description`                               | string   | Yes      | Description of the agent's purpose                                                                                                 |
| `avatar_color`                              | string   | No       | Hex color code for the avatar (e.g. `"#FF5733"`)                                                                                   |
| `avatar_symbol`                             | string   | No       | Symbol or initials for the avatar                                                                                                  |
| `labels`                                    | string[] | No       | Labels for categorization                                                                                                          |
| `visibility`                                | string   | No       | **Technical Preview (9.4.0).** `"public"`, `"shared"`, or `"private"`                                                              |
| `configuration`                             | object   | Yes      | Agent configuration (see below)                                                                                                    |
| `configuration.instructions`                | string   | No       | System instructions that define agent behavior                                                                                     |
| `configuration.tools`                       | array    | Yes      | Array of tool selection objects, each containing a `tool_ids` string array                                                         |
| `configuration.skill_ids`                   | string[] | No       | Array of skill IDs (max 100)                                                                                                       |
| `configuration.enable_elastic_capabilities` | boolean  | No       | Enable built-in Elastic capabilities                                                                                               |
| `configuration.workflow_ids`                | string[] | No       | Workflow IDs to run before every execution (max 100)                                                                               |
| `configuration.plugin_ids`                  | string[] | No       | Plugin IDs to assign (max 100)                                                                                                     |

**Visibility options:**
- `public` — any privileged user can read and write
- `shared` — any privileged user can read; only the owner can write
- `private` — only the owner can read and write

**Response:** The created `AgentDefinition`.

**Example:**

```bash
curl -s -X POST "https://localhost:5601/api/agent_builder/agents" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-security-agent",
    "name": "Security Analyst",
    "description": "Analyzes security events and provides threat insights",
    "avatar_color": "#FF5733",
    "labels": ["security"],
    "visibility": "shared",
    "configuration": {
      "instructions": "You are a security analyst specializing in threat detection. Always provide actionable recommendations.",
      "tools": [
        { "tool_ids": ["esql.security-events", "index_search.alerts"] }
      ],
      "skill_ids": [],
      "enable_elastic_capabilities": true
    }
  }'
```

---

### Update an agent

Update any aspect of an existing agent. All body fields are optional — only supplied fields are updated.

```
PUT /api/agent_builder/agents/{id}
```

**Required privilege:** `agentBuilder:manageAgents`

**Path parameters:**

| Parameter | Type   | Description                     |
|-----------|--------|---------------------------------|
| `id`      | string | Unique identifier of the agent  |

**Request body:** Same fields as create, but all are optional.

**Response:** The updated `AgentDefinition`.

**Example:**

```bash
curl -s -X PUT "https://localhost:5601/api/agent_builder/agents/my-security-agent" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Senior Security Analyst",
    "configuration": {
      "instructions": "You are a senior security analyst. Prioritize critical threats.",
      "tools": [
        { "tool_ids": ["esql.security-events", "index_search.alerts", "esql.host-details"] }
      ]
    }
  }'
```

---

### Delete an agent

Permanently delete an agent. This action cannot be undone.

```
DELETE /api/agent_builder/agents/{id}
```

**Required privilege:** `agentBuilder:manageAgents`

**Path parameters:**

| Parameter | Type   | Description                     |
|-----------|--------|---------------------------------|
| `id`      | string | Unique identifier of the agent  |

**Response:**

```json
{
  "success": true
}
```

**Example:**

```bash
curl -s -X DELETE "https://localhost:5601/api/agent_builder/agents/my-security-agent" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true"
```

---

## Chat (Converse)

Send messages to an agent and receive responses. Two modes are available: synchronous (waits for the complete response) and streaming (returns Server-Sent Events as the agent processes).

### Send chat message (synchronous)

Send a message and wait for the complete response.

```
POST /api/agent_builder/converse
```

**Required privilege:** `agentBuilder:read`

**Request body:**

| Field                     | Type     | Required | Description                                                                                                           |
|---------------------------|----------|----------|-----------------------------------------------------------------------------------------------------------------------|
| `agent_id`                | string   | No       | Agent to chat with. Defaults to the built-in Elastic AI agent.                                                        |
| `input`                   | string   | No       | The user message to send                                                                                              |
| `conversation_id`         | string   | No       | Existing conversation ID to continue. Omit to start a new conversation.                                               |
| `connector_id`            | string   | No       | Connector ID for model routing. Mutually exclusive with `inference_id`.                                               |
| `inference_id`            | string   | No       | Inference endpoint ID. Mutually exclusive with `connector_id`.                                                        |
| `attachments`             | array    | No       | **Technical Preview (9.3.0).** Attachments to include. Each needs `type` and either `data` or `origin`.               |
| `capabilities`            | object   | No       | `{ "visualizations": true }` to enable visualization rendering                                                        |
| `browser_api_tools`       | array    | No       | Client-side tools registered in `browser.*` namespace                                                                 |
| `configuration_overrides` | object   | No       | Runtime overrides for `instructions` and `tools` (this execution only)                                                |
| `prompts`                 | object   | No       | Respond to a confirmation prompt. Record mapping prompt ID to `{ "allow": boolean }`.                                 |
| `action`                  | string   | No       | `"regenerate"` to re-execute the last round. Requires `conversation_id`.                                              |
| `_execution_mode`         | string   | No       | **Experimental (9.4.0).** `"local"` or `"task_manager"` to force execution mode.                                      |

**Response:**

```json
{
  "conversation_id": "conv-abc-123",
  "round_id": "round-xyz-456",
  "steps": [
    {
      "type": "tool_call",
      "tool_id": "esql.security-events",
      "params": { "query": "FROM logs-* | WHERE event.severity > 3 | LIMIT 10" },
      "result": { ... }
    }
  ],
  "response": {
    "message": "I found 10 high-severity security events in the last 24 hours. Here is a summary...",
    "prompts": []
  }
}
```

**Example — start a new conversation:**

```bash
curl -s -X POST "https://localhost:5601/api/agent_builder/converse" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "my-security-agent",
    "input": "Show me the top security alerts from the last 24 hours"
  }'
```

**Example — continue an existing conversation:**

```bash
curl -s -X POST "https://localhost:5601/api/agent_builder/converse" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "my-security-agent",
    "conversation_id": "conv-abc-123",
    "input": "Can you provide more details on the critical alerts?"
  }'
```

**Example — regenerate the last response:**

```bash
curl -s -X POST "https://localhost:5601/api/agent_builder/converse" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "conv-abc-123",
    "action": "regenerate"
  }'
```

**Example — with runtime configuration overrides:**

```bash
curl -s -X POST "https://localhost:5601/api/agent_builder/converse" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "my-security-agent",
    "input": "Summarize network traffic anomalies",
    "configuration_overrides": {
      "instructions": "Focus only on network-related events. Be concise.",
      "tools": [
        { "tool_ids": ["esql.network-traffic"] }
      ]
    }
  }'
```

---

### Send chat message (streaming)

Send a message and receive a real-time stream of Server-Sent Events (SSE) as the agent processes.

```
POST /api/agent_builder/converse/async
```

**Required privilege:** `agentBuilder:read`

**Request body:** Same as the synchronous `/converse` endpoint.

**Response:** `text/event-stream` (SSE). Events are emitted as the agent executes tool calls and generates its response.

**Example:**

```bash
curl -s -N -X POST "https://localhost:5601/api/agent_builder/converse/async" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "my-security-agent",
    "input": "Analyze recent failed login attempts"
  }'
```

The response streams events such as:

```
event: conversationCreated
data: {"conversation_id":"conv-abc-123"}

event: toolCallStarted
data: {"tool_id":"esql.auth-events","params":{"query":"..."}}

event: toolCallCompleted
data: {"tool_id":"esql.auth-events","result":{...}}

event: message
data: {"content":"Based on the analysis..."}

event: roundComplete
data: {"round_id":"round-xyz-456","steps":[...],"response":{...}}
```

---

## Conversations

Manage conversation history. Conversations are automatically created when you chat with an agent.

### List conversations

```
GET /api/agent_builder/conversations
```

**Required privilege:** `agentBuilder:read`

**Query parameters:**

| Parameter  | Type   | Required | Description                          |
|------------|--------|----------|--------------------------------------|
| `agent_id` | string | No       | Filter conversations by agent ID     |

**Response:**

```json
{
  "results": [
    {
      "id": "conv-abc-123",
      "title": "Security alert analysis",
      "agent_id": "my-security-agent",
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:45:00Z"
    }
  ]
}
```

**Example:**

```bash
curl -s -X GET "https://localhost:5601/api/agent_builder/conversations?agent_id=my-security-agent" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>"
```

---

### Get conversation by ID

Retrieve the complete conversation including all rounds and messages.

```
GET /api/agent_builder/conversations/{conversation_id}
```

**Required privilege:** `agentBuilder:read`

**Path parameters:**

| Parameter         | Type   | Description                           |
|-------------------|--------|---------------------------------------|
| `conversation_id` | string | Unique identifier of the conversation |

**Example:**

```bash
curl -s -X GET "https://localhost:5601/api/agent_builder/conversations/conv-abc-123" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>"
```

---

### Delete conversation

Permanently delete a conversation. This action cannot be undone.

```
DELETE /api/agent_builder/conversations/{conversation_id}
```

**Required privilege:** `agentBuilder:read`

**Path parameters:**

| Parameter         | Type   | Description                           |
|-------------------|--------|---------------------------------------|
| `conversation_id` | string | Unique identifier of the conversation |

**Response:**

```json
{
  "success": true
}
```

**Example:**

```bash
curl -s -X DELETE "https://localhost:5601/api/agent_builder/conversations/conv-abc-123" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true"
```

---

## Attachments

Manage versioned attachments within a conversation. Attachments can contain text, ES|QL queries, visualizations, and other data.

> **Stability:** Experimental (since 9.2.0)

### List attachments

```
GET /api/agent_builder/conversations/{conversation_id}/attachments
```

**Required privilege:** `agentBuilder:read`

**Query parameters:**

| Parameter         | Type    | Required | Description                               |
|-------------------|---------|----------|-------------------------------------------|
| `include_deleted` | boolean | No       | Include soft-deleted attachments           |

**Response:**

```json
{
  "results": [
    {
      "id": "att-001",
      "type": "text",
      "description": "Investigation notes",
      "current_version": 2,
      "active": true,
      "versions": [...]
    }
  ],
  "total_token_estimate": 1500
}
```

**Example:**

```bash
curl -s -X GET "https://localhost:5601/api/agent_builder/conversations/conv-abc-123/attachments" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>"
```

---

### Check attachment staleness

Check whether any attachments are out of date relative to their origin source. Available since 9.4.0.

```
GET /api/agent_builder/conversations/{conversation_id}/attachments/stale
```

**Required privilege:** `agentBuilder:read`

**Response:**

```json
{
  "attachments": [
    {
      "id": "att-001",
      "is_stale": false
    },
    {
      "id": "att-002",
      "is_stale": true
    }
  ]
}
```

---

### Create attachment

```
POST /api/agent_builder/conversations/{conversation_id}/attachments
```

**Required privilege:** `agentBuilder:read`

**Request body:**

| Field         | Type    | Required | Description                                                                              |
|---------------|---------|----------|------------------------------------------------------------------------------------------|
| `id`          | string  | No       | Custom attachment ID. Auto-generated if omitted.                                         |
| `type`        | string  | Yes      | Attachment type (e.g. `"text"`, `"esql"`, `"visualization"`)                             |
| `data`        | any     | No*      | Attachment payload. Required unless `origin` is provided.                                |
| `origin`      | string  | No*      | Origin reference (e.g. saved object ID). Content is resolved at creation time.           |
| `description` | string  | No       | Human-readable description                                                               |
| `hidden`      | boolean | No       | Hide attachment from the UI                                                              |

*One of `data` or `origin` is required.

**Response:**

```json
{
  "attachment": {
    "id": "att-003",
    "type": "text",
    "description": "Analysis report",
    "current_version": 1,
    "active": true,
    "versions": [...]
  }
}
```

**Example:**

```bash
curl -s -X POST "https://localhost:5601/api/agent_builder/conversations/conv-abc-123/attachments" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "data": { "content": "Initial investigation notes for incident #42" },
    "description": "Investigation notes"
  }'
```

---

### Update attachment

Update the content of an attachment. Creates a new version if the content changed.

```
PUT /api/agent_builder/conversations/{conversation_id}/attachments/{attachment_id}
```

**Required privilege:** `agentBuilder:read`

**Request body:**

| Field         | Type   | Required | Description                  |
|---------------|--------|----------|------------------------------|
| `data`        | any    | Yes      | New attachment data/content  |
| `description` | string | No       | New description              |

**Response:**

```json
{
  "attachment": { ... },
  "new_version": 2
}
```

---

### Delete attachment

Soft-delete or permanently delete an attachment.

```
DELETE /api/agent_builder/conversations/{conversation_id}/attachments/{attachment_id}
```

**Required privilege:** `agentBuilder:read`

**Query parameters:**

| Parameter   | Type    | Required | Description                                                   |
|-------------|---------|----------|---------------------------------------------------------------|
| `permanent` | boolean | No       | `true` to permanently remove (only for unreferenced items)    |

**Response:**

```json
{
  "success": true,
  "permanent": false
}
```

---

### Restore deleted attachment

Restore a soft-deleted attachment.

```
POST /api/agent_builder/conversations/{conversation_id}/attachments/{attachment_id}/_restore
```

**Required privilege:** `agentBuilder:read`

**Response:**

```json
{
  "success": true,
  "attachment": { ... }
}
```

---

### Rename attachment

Update the description of an attachment without creating a new version.

```
PATCH /api/agent_builder/conversations/{conversation_id}/attachments/{attachment_id}
```

**Required privilege:** `agentBuilder:read`

**Request body:**

| Field         | Type   | Required | Description        |
|---------------|--------|----------|--------------------|
| `description` | string | Yes      | New description    |

**Response:**

```json
{
  "success": true,
  "attachment": { ... }
}
```

---

### Update attachment origin

Link an attachment to its persistent store (e.g. after saving a by-value attachment). Available since 9.4.0.

```
PUT /api/agent_builder/conversations/{conversation_id}/attachments/{attachment_id}/origin
```

**Required privilege:** `agentBuilder:read`

**Request body:**

| Field    | Type   | Required | Description                                |
|----------|--------|----------|--------------------------------------------|
| `origin` | string | Yes      | Origin string (e.g. saved object ID)       |

**Response:**

```json
{
  "success": true,
  "attachment": { ... }
}
```

---

## Tools

Manage custom tools that agents can use. Tools represent specific capabilities such as ES|QL queries, index searches, or external integrations.

### List tools

```
GET /api/agent_builder/tools
```

**Required privilege:** `agentBuilder:read`

**Response:**

```json
{
  "results": [
    {
      "id": "esql.security-events",
      "type": "esql",
      "description": "Query security events using ES|QL",
      "tags": ["security"],
      "readonly": false,
      "configuration": {
        "query": "FROM logs-* | WHERE event.category == \"security\""
      }
    }
  ]
}
```

**Example:**

```bash
curl -s -X GET "https://localhost:5601/api/agent_builder/tools" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>"
```

---

### Get tool by ID

Retrieve a tool including its full schema definition.

```
GET /api/agent_builder/tools/{toolId}
```

**Required privilege:** `agentBuilder:read`

**Path parameters:**

| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| `toolId`  | string | Unique identifier of the tool  |

**Example:**

```bash
curl -s -X GET "https://localhost:5601/api/agent_builder/tools/esql.security-events" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>"
```

---

### Create a tool

```
POST /api/agent_builder/tools
```

**Required privilege:** `agentBuilder:manageTools`

**Request body:**

| Field           | Type     | Required | Description                                          |
|-----------------|----------|----------|------------------------------------------------------|
| `id`            | string   | Yes      | Unique identifier                                    |
| `type`          | string   | Yes      | Tool type (e.g. `"esql"`, `"index_search"`)          |
| `description`   | string   | No       | Description of what the tool does (defaults to `""`)  |
| `tags`          | string[] | No       | Tags for categorization (defaults to `[]`)            |
| `configuration` | object   | Yes      | Type-specific configuration                          |

**Response:** The created tool definition including its schema.

**Example — create an ES|QL tool:**

```bash
curl -s -X POST "https://localhost:5601/api/agent_builder/tools" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "esql.network-anomalies",
    "type": "esql",
    "description": "Detect network traffic anomalies using ES|QL",
    "tags": ["network", "security"],
    "configuration": {
      "query": "FROM logs-network-* | WHERE anomaly_score > 0.8 | SORT @timestamp DESC | LIMIT 50"
    }
  }'
```

---

### Update a tool

```
PUT /api/agent_builder/tools/{toolId}
```

**Required privilege:** `agentBuilder:manageTools`

**Path parameters:**

| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| `toolId`  | string | Unique identifier of the tool  |

**Request body:**

| Field           | Type     | Required | Description                          |
|-----------------|----------|----------|--------------------------------------|
| `description`   | string   | No       | Updated description                  |
| `tags`          | string[] | No       | Updated tags                         |
| `configuration` | object   | No       | Updated type-specific configuration  |

**Example:**

```bash
curl -s -X PUT "https://localhost:5601/api/agent_builder/tools/esql.network-anomalies" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated: Detect network anomalies with high confidence",
    "configuration": {
      "query": "FROM logs-network-* | WHERE anomaly_score > 0.9 | SORT @timestamp DESC | LIMIT 100"
    }
  }'
```

---

### Delete a tool

```
DELETE /api/agent_builder/tools/{toolId}
```

**Required privilege:** `agentBuilder:manageTools`

**Path parameters:**

| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| `toolId`  | string | Unique identifier of the tool  |

**Query parameters:**

| Parameter | Type    | Default | Description                                                                                         |
|-----------|---------|---------|-----------------------------------------------------------------------------------------------------|
| `force`   | boolean | `false` | When `true`, removes the tool from all agents that use it before deleting. When `false`, returns `409 Conflict` if agents reference the tool. |

**Response (success):**

```json
{
  "success": true
}
```

**Response (409 Conflict when `force=false` and tool is in use):**

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Tool is used by one or more agents. Use force=true to remove it from agents and delete.",
  "attributes": {
    "code": "TOOL_USED_BY_AGENTS",
    "agents": [
      { "id": "my-security-agent", "name": "Security Analyst" }
    ]
  }
}
```

**Example:**

```bash
curl -s -X DELETE "https://localhost:5601/api/agent_builder/tools/esql.network-anomalies?force=true" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true"
```

---

### Execute a tool

Run a tool directly with specified parameters.

```
POST /api/agent_builder/tools/_execute
```

**Required privilege:** `agentBuilder:read`

**Request body:**

| Field          | Type   | Required | Description                                          |
|----------------|--------|----------|------------------------------------------------------|
| `tool_id`      | string | Yes      | ID of the tool to execute                            |
| `tool_params`  | object | Yes      | Parameters to pass to the tool                       |
| `connector_id` | string | No       | Connector ID for tools needing external integrations |

**Response:**

```json
{
  "results": [
    {
      "type": "text",
      "content": "..."
    }
  ]
}
```

**Example:**

```bash
curl -s -X POST "https://localhost:5601/api/agent_builder/tools/_execute" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "esql.security-events",
    "tool_params": {
      "query": "FROM logs-* | WHERE event.severity > 3 | STATS count=COUNT(*) BY event.action | SORT count DESC | LIMIT 5"
    }
  }'
```

---

## Skills

Skills are reusable instruction sets (in Markdown) that provide domain expertise to agents. They can reference tools and supplementary content.

> **Stability:** Experimental (since 9.4.0)

### List skills

```
GET /api/agent_builder/skills
```

**Required privilege:** `agentBuilder:read`

**Query parameters:**

| Parameter         | Type    | Default | Description                        |
|-------------------|---------|---------|------------------------------------|
| `include_plugins` | boolean | `false` | Include skills from plugins        |

**Response:**

```json
{
  "results": [
    {
      "id": "threat-analysis",
      "name": "Threat Analysis",
      "description": "Provides threat detection and analysis expertise",
      "readonly": false
    }
  ]
}
```

**Example:**

```bash
curl -s -X GET "https://localhost:5601/api/agent_builder/skills?include_plugins=true" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>"
```

---

### Get skill by ID

```
GET /api/agent_builder/skills/{skillId}
```

**Required privilege:** `agentBuilder:read`

**Path parameters:**

| Parameter | Type   | Description                              |
|-----------|--------|------------------------------------------|
| `skillId` | string | Unique skill identifier (1–512 chars)    |

**Response:** Full skill definition including content and referenced tools.

---

### Create a skill

```
POST /api/agent_builder/skills
```

**Required privilege:** `agentBuilder:manageSkills`

**Request body:**

| Field                | Type     | Required | Description                                                  |
|----------------------|----------|----------|--------------------------------------------------------------|
| `id`                 | string   | Yes      | Unique identifier                                            |
| `name`               | string   | Yes      | Human-readable name                                          |
| `description`        | string   | Yes      | Description of the skill                                     |
| `content`            | string   | Yes      | Skill instructions in Markdown                               |
| `referenced_content` | array    | No       | Array of `{ name, relativePath, content }` objects (max 100) |
| `tool_ids`           | string[] | No       | Tool IDs this skill references (max 100)                     |

**Example:**

```bash
curl -s -X POST "https://localhost:5601/api/agent_builder/skills" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "incident-response",
    "name": "Incident Response",
    "description": "Guides the agent through incident response procedures",
    "content": "# Incident Response Procedure\n\n## Step 1: Triage\nAssess the severity of the incident using the security events tool.\n\n## Step 2: Containment\nIdentify affected hosts and recommend isolation steps.\n\n## Step 3: Investigation\nUse ES|QL to correlate events across data sources.",
    "tool_ids": ["esql.security-events", "index_search.alerts"],
    "referenced_content": [
      {
        "name": "Runbook",
        "relativePath": "runbooks/incident_response.md",
        "content": "# Runbook: Critical Incident Response\n\nEscalation contacts: ..."
      }
    ]
  }'
```

---

### Update a skill

```
PUT /api/agent_builder/skills/{skillId}
```

**Required privilege:** `agentBuilder:manageSkills`

**Request body:** Same fields as create, all optional.

**Example:**

```bash
curl -s -X PUT "https://localhost:5601/api/agent_builder/skills/incident-response" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Updated Incident Response Procedure\n\n## Step 1: Triage\n...(updated content)..."
  }'
```

---

### Delete a skill

```
DELETE /api/agent_builder/skills/{skillId}
```

**Required privilege:** `agentBuilder:manageSkills`

**Query parameters:**

| Parameter | Type    | Default | Description                                                                                           |
|-----------|---------|---------|-------------------------------------------------------------------------------------------------------|
| `force`   | boolean | `false` | When `true`, removes the skill from all agents before deleting. When `false`, returns `409` if in use. |

Built-in (read-only) skills cannot be deleted and return `400 Bad Request`.

**Response (409 Conflict when `force=false` and skill is in use):**

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Skill is used by one or more agents. Use force=true to remove it from agents and delete.",
  "attributes": {
    "code": "SKILL_USED_BY_AGENTS",
    "agents": [
      { "id": "my-security-agent", "name": "Security Analyst" }
    ]
  }
}
```

---

## Plugins

Install and manage plugins that bundle agent capabilities (skills, referenced content). Plugins follow the [Claude agent plugin specification](https://code.claude.com/docs/en/plugins).

> **Stability:** Experimental (since 9.4.0). Requires the experimental features setting to be enabled.

### List plugins

```
GET /api/agent_builder/plugins
```

**Required privilege:** `agentBuilder:read`

**Response:**

```json
{
  "results": [
    {
      "id": "plugin-abc",
      "name": "Security Analysis Plugin",
      "description": "Provides advanced security analysis skills",
      "skills": ["threat-intel", "forensics"],
      "source": "https://github.com/example/security-plugin"
    }
  ]
}
```

---

### Get plugin by ID

```
GET /api/agent_builder/plugins/{pluginId}
```

**Required privilege:** `agentBuilder:read`

---

### Install a plugin

Install a plugin from a URL (GitHub repository or direct ZIP download).

```
POST /api/agent_builder/plugins/install
```

**Required privilege:** `agentBuilder:write`

**Request body:**

| Field         | Type   | Required | Description                                                   |
|---------------|--------|----------|---------------------------------------------------------------|
| `url`         | string | Yes      | GitHub URL or direct ZIP URL                                  |
| `plugin_name` | string | No       | Override name (defaults to the plugin manifest name)          |

**Example:**

```bash
curl -s -X POST "https://localhost:5601/api/agent_builder/plugins/install" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/example/elastic-security-plugin",
    "plugin_name": "Security Analysis"
  }'
```

---

### Delete a plugin

```
DELETE /api/agent_builder/plugins/{pluginId}
```

**Required privilege:** `agentBuilder:write`

**Query parameters:**

| Parameter | Type    | Default | Description                                                                                                    |
|-----------|---------|---------|----------------------------------------------------------------------------------------------------------------|
| `force`   | boolean | `false` | When `true`, removes the plugin's skills from all agents before deleting. When `false`, returns `409` if in use. |

**Response (409 Conflict):**

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Plugin is used by one or more agents. Use force=true to remove it from agents and delete.",
  "attributes": {
    "code": "PLUGIN_USED_BY_AGENTS",
    "agents": [...]
  }
}
```

---

## Consumption

Retrieve token usage statistics for agent conversations. Useful for monitoring costs and identifying high-consumption conversations.

> **Stability:** Experimental (since 9.4.0)

### Get agent consumption data

```
POST /api/agent_builder/agents/{agent_id}/consumption
```

**Required privilege:** `agentBuilder:manageAgents`

**Path parameters:**

| Parameter  | Type   | Description              |
|------------|--------|--------------------------|
| `agent_id` | string | Agent identifier          |

**Request body:**

| Field          | Type     | Default        | Description                                                        |
|----------------|----------|----------------|--------------------------------------------------------------------|
| `size`         | number   | `25`           | Results per page (1–100)                                           |
| `sort_field`   | string   | `"updated_at"` | Sort by `"updated_at"`, `"total_tokens"`, or `"round_count"`       |
| `sort_order`   | string   | `"desc"`       | `"asc"` or `"desc"`                                                |
| `search_after` | array    | —              | Cursor from previous response for pagination                       |
| `search`       | string   | —              | Free-text search on conversation title                             |
| `usernames`    | string[] | —              | Filter by usernames                                                |
| `has_warnings` | boolean  | —              | Filter for conversations with/without high-token warnings          |

**Response:**

```json
{
  "results": [
    {
      "conversation_id": "conv-abc-123",
      "title": "Security alert analysis",
      "user": { "id": "user-1", "username": "analyst" },
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:45:00Z",
      "token_usage": {
        "input_tokens": 15000,
        "output_tokens": 3500,
        "total_tokens": 18500
      },
      "round_count": 5,
      "llm_calls": 12,
      "warnings": []
    }
  ],
  "total": 42,
  "search_after": ["2025-01-15T10:45:00Z", "conv-abc-123"],
  "aggregations": {
    "usernames": ["analyst", "admin"],
    "total_with_warnings": 3
  }
}
```

**Example:**

```bash
curl -s -X POST "https://localhost:5601/api/agent_builder/agents/my-security-agent/consumption" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "size": 10,
    "sort_field": "total_tokens",
    "sort_order": "desc",
    "has_warnings": true
  }'
```

---

## MCP Server

The Agent Builder exposes an MCP (Model Context Protocol) endpoint for integration with MCP-compatible clients such as Claude Desktop, Cursor, VS Code, and others.

> **Note:** This endpoint is designed for MCP clients and should not be used directly as a REST API. Use MCP Inspector or native MCP clients instead.

```
POST /api/agent_builder/mcp
```

**Required privilege:** `agentBuilder:read`

**Special headers:**
- `kbn-xsrf` is **not required** (XSRF is disabled for this route)
- Accepts OAuth tokens (`security:acceptUiamOAuth`)

**Query parameters:**

| Parameter   | Type   | Required | Description                                              |
|-------------|--------|----------|----------------------------------------------------------|
| `namespace` | string | No       | Comma-separated namespaces to filter available tools     |

**Request body:** JSON-RPC 2.0 payload (MCP protocol messages).

**MCP client configuration example (Claude Desktop / Cursor):**

```json
{
  "mcpServers": {
    "elastic": {
      "url": "https://your-kibana.elastic.cloud/api/agent_builder/mcp",
      "headers": {
        "Authorization": "ApiKey <your-api-key>",
        "elastic-api-version": "2023-10-31"
      }
    }
  }
}
```

**With namespace filtering:**

```json
{
  "mcpServers": {
    "elastic-security": {
      "url": "https://your-kibana.elastic.cloud/api/agent_builder/mcp?namespace=esql,index_search",
      "headers": {
        "Authorization": "ApiKey <your-api-key>",
        "elastic-api-version": "2023-10-31"
      }
    }
  }
}
```

---

## A2A (Agent-to-Agent)

The Agent Builder supports the A2A (Agent-to-Agent) protocol for inter-agent communication and discovery.

> **Stability:** Experimental (since 9.2.0)

### Get A2A agent card

Retrieve agent discovery metadata in the A2A protocol format.

```
GET /api/agent_builder/a2a/{agentId}.json
```

**Required privilege:** `agentBuilder:read`

**Path parameters:**

| Parameter | Type   | Description              |
|-----------|--------|--------------------------|
| `agentId` | string | Agent identifier          |

**Example:**

```bash
curl -s -X GET "https://localhost:5601/api/agent_builder/a2a/my-security-agent.json" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Authorization: ApiKey <your-api-key>"
```

---

### Send A2A task

Send a task to an agent using the A2A protocol.

> **Note:** This endpoint is designed for A2A protocol clients and should not be used directly as a REST API. Use an A2A SDK or A2A Inspector instead.

```
POST /api/agent_builder/a2a/{agentId}
```

**Required privilege:** `agentBuilder:read`

**Special headers:**
- `kbn-xsrf` is **not required** (XSRF is disabled for this route)

**Request body:** JSON-RPC 2.0 payload (A2A protocol messages).

---

## Authorization & Privileges

All Agent Builder APIs require Kibana feature privileges. These are assigned via Kibana roles.

| Privilege                   | Description                                  | Used by                                      |
|-----------------------------|----------------------------------------------|----------------------------------------------|
| `agentBuilder:read`         | Read access to agents, tools, conversations  | List/get endpoints, chat, tool execution     |
| `agentBuilder:write`        | General write access                         | Plugin management                            |
| `agentBuilder:manageAgents` | Create, update, delete agents                | Agent CRUD, consumption data                 |
| `agentBuilder:manageTools`  | Create, update, delete tools                 | Tool CRUD                                    |
| `agentBuilder:manageSkills` | Create, update, delete skills                | Skill CRUD                                   |

---

## Error Handling

The API uses standard HTTP status codes and returns structured error responses.

### Common error codes

| Status | Meaning               | When                                                          |
|--------|-----------------------|---------------------------------------------------------------|
| 400    | Bad Request           | Invalid parameters, missing required fields, built-in skill delete attempt |
| 401    | Unauthorized          | Missing or invalid authentication                             |
| 403    | Forbidden             | Insufficient privileges                                       |
| 404    | Not Found             | Resource does not exist                                       |
| 409    | Conflict              | Resource in use by agents (tools/skills/plugins)              |
| 500    | Internal Server Error | Unexpected server error                                       |

### Error response format

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Tool is used by one or more agents. Use force=true to remove it from agents and delete.",
  "attributes": {
    "code": "TOOL_USED_BY_AGENTS",
    "agents": [
      { "id": "agent-1", "name": "My Agent" }
    ]
  }
}
```

### Conflict error codes

| Code                      | Description                                       |
|---------------------------|---------------------------------------------------|
| `TOOL_USED_BY_AGENTS`     | Tool is referenced by one or more agents          |
| `SKILL_USED_BY_AGENTS`    | Skill is referenced by one or more agents         |
| `PLUGIN_USED_BY_AGENTS`   | Plugin is referenced by one or more agents        |

For all three, pass `?force=true` to automatically detach from agents and proceed with deletion.
