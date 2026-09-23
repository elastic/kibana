/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { DISCOVER_SESSION_SKILL_ID } from '../../common/agent_builder';

const TOOL_IDS = [platformCoreTools.generateEsql, platformCoreTools.createDiscoverSession];

export const discoverSessionSkill = defineSkillType({
  id: DISCOVER_SESSION_SKILL_ID,
  name: 'discover-session',
  basePath: 'skills/platform/discover',
  experimental: true,
  description:
    'Shows Elasticsearch documents and events as a live Discover table in chat. Use when the user wants to see rows, hits, or logs — not charts or aggregations.',
  content: `## When to Use This Skill

Use this skill when the user wants to **see documents, events, search hits, or logs** as a table in chat (for example "show me nginx 5xx events", "list the matching documents", "open these rows in a table").

Do **not** use this skill when the user wants a chart, metric, trend, breakdown, or any \`STATS\` aggregation. Use the visualization-creation skill and \`${platformCoreTools.createVisualization}\` instead.

## Routing

- Documents / rows / events / "show me the logs" → \`${platformCoreTools.createDiscoverSession}\` then \`<render_attachment>\`
- Aggregations / charts / \`STATS\` → \`${platformCoreTools.createVisualization}\` (never a Discover session)

Lens \`data_table\` is only for aggregated tabular summaries. It is not a substitute for a Discover document table.

## Workflow

1. Ground the index and field names if they are not already in context. Do not invent index or field names.
2. If creating a new table, call \`${platformCoreTools.generateEsql}\` once to produce a **document** query (\`FROM\` or \`TS\` with \`WHERE\` / \`LIMIT\` as needed). Do not invent ES|QL. Do not use \`STATS\`.
3. Make at most one successful \`${platformCoreTools.createDiscoverSession}\` change per user request:
   - Omit \`attachment_id\` unless a previous result from this tool returned that exact ID.
   - To **create** when the conversation has no Discover session: omit \`attachment_id\`. Pass \`esql\` as the **string** from generateEsql (the \`esql\` field, not the whole tool result). \`title\` is optional. Optional \`time_range\`. Omit \`columns\` unless the user named specific fields — the table then uses a matching Discover profile, or Summary plus time.
   - If exactly one Discover session exists, omit \`attachment_id\` to **update** that table. Pass \`create_new: true\` and omit \`attachment_id\` only when the user asked for another table.
   - If more than one Discover session exists, pass the exact \`attachment_id\` from an earlier result of this tool when you know which table to update. If you do not, ask the user which table to update instead of omitting \`attachment_id\`.
   - Call \`${platformCoreTools.generateEsql}\` on update **only** when the user wants a different query. For title or time-range-only changes, omit \`esql\` so the stored query is kept. Pass \`columns\` only when the user named specific fields.
4. After a successful tool result, **stop calling tools**. Paste the returned \`render\` string into your reply verbatim. Do not construct a \`<render_attachment>\` tag yourself. If the tool reports that multiple Discover sessions exist, you may call it once more with one exact listed \`attachment_id\` when you can identify the intended table. Do not repeat the same failing call, and do not retry other errors.

Do not paste rows, tab JSON, or vis_context into the conversation. This skill does not execute ES|QL; the Discover table in chat runs the query.
`,
  getRegistryTools: () => TOOL_IDS,
});
