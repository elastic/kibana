/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const stepExecutionSkill = defineSkillType({
  id: 'step-execution',
  name: 'step-execution',
  experimental: true,
  basePath: 'skills/platform/workflows',
  description:
    'Execute workflow steps as tools and chain them together.',
  content: `## Workflow Steps

You have workflow steps you can execute directly. Chain them to accomplish tasks.

### RULE #1: External Services — ALWAYS Check Connectors First

When the user wants to interact with ANY external service (GitHub, Jira, Slack, PagerDuty, Google, etc.):

**BEFORE calling any step, ALWAYS call get_connectors first.**

Then:
1. If a configured connector exists → use step.connector-step(connectorId, action) to run an action on it.
2. If no configured connector → get_connectors will show the user a choice dialog. Based on the result:
   - User chose a dedicated connector → call connect_connector to create it (will ask for credentials). Then call step.connector-step to execute.
   - User chose HTTP fallback → use the http step.
3. After connect_connector returns, ALWAYS call step.connector-step immediately with the connectorId and the appropriate action. Do NOT stop.

**NEVER skip step 1.** Check connectors first.

### Key Steps

- **elasticsearch.search** — Search ES with natural language ("query" + "path")
- **elasticsearch.request** — Raw ES API (method, path, body)
- **ai.summarize** — Summarize content ("input" for data, "instructions" for guidance)
- **ai.prompt** — LLM prompt ("prompt" + optional "systemPrompt")
- **http** — Generic HTTP fallback. ONLY use after confirming no dedicated connector exists (see Rule #1)
- **slack** — Send Slack messages (connector auto-resolved)
- **data.regex-replace** — Regex find/replace
- **kibana.create-case** — Create a Kibana case
- Plus many more: data.filter, data.map, email, pagerduty, jira, etc.

### How to Work

1. For external services: ALWAYS call get_connectors first (Rule #1)
2. Call steps one at a time, read output, chain to next
3. External steps auto-resolve connectors and ask user approval
4. When processing multiple items, iterate: call steps for EACH item
5. Do NOT try to generate workflow YAML — the user can click "Save as Workflow"

### ES Search

Provide natural language in "query":
  query: "errors in the last 15 minutes"
  path: "/logs-*/_search"

### HTTP Requests (Generic Fallback ONLY)

Use ONLY after confirming no dedicated connector exists (Rule #1):
  url: "https://api.example.com/data"
  method: "GET"

If auth is required, the user will be prompted for credentials automatically.

### AI Steps

- ai.summarize: use "input" for content, "instructions" for how to summarize
- ai.prompt: use "prompt" for the request
- Both auto-resolve inference connectors

### Iterating Over Results

When you have multiple items (alerts, errors, documents):
- Process each item individually
- Build a formatted output with one entry per item
- Include key details: timestamp, severity, rule name, message
- The saved workflow will use foreach for the same logic
`,
});
