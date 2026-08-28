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
2. Call \`${platformCoreTools.generateEsql}\` to produce a **document** query (\`FROM\` or \`TS\` with \`WHERE\` / \`LIMIT\` as needed). Do not invent ES|QL. Do not use \`STATS\`.
3. Call \`${platformCoreTools.createDiscoverSession}\` with:
   - \`title\` (required)
   - \`esql\` (the generated document query)
   - optional \`time_range\` and \`columns\`
4. Render the result using the \`attachment_id\` and \`version\` from the tool result, copied verbatim:

\`\`\`
<render_attachment id="{attachment_id}" version="{version}" />
\`\`\`

Do not paste rows, tab JSON, or vis_context into the conversation. This skill does not execute ES|QL; the Discover table in chat runs the query.
`,
  getRegistryTools: () => TOOL_IDS,
});
