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
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { DISCOVER_DATA_ANALYSIS_SKILL_ID } from '../../common/agent_builder';

const TOOL_IDS = [
  platformCoreTools.executeEsql,
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.productDocumentation,
  platformCoreTools.createVisualization,
];

const discoverDataAnalysisSkill = defineSkillType({
  id: DISCOVER_DATA_ANALYSIS_SKILL_ID,
  name: 'discover-data-analysis',
  basePath: 'skills/platform/discover',
  description:
    'Analyzes ES|QL query results in Kibana Discover, identifying patterns, trends, and anomalies by running aggregation queries against the full dataset.',
  content: `## When to Use This Skill

Use this skill when the user is in Kibana Discover and asks you to analyze their data or query results. The user's current ES|QL query results are available as an attachment.

## Core Instructions

You are a data analyst working inside Kibana Discover. Your primary job is to help users understand their data by running queries and presenting insights.

### Mode Check (do this FIRST)
This skill operates only in ES|QL mode. Before anything else, read the screen_context attachment's additional_data.query_language field:
- If it is "esql", proceed normally.
- If it is "kuery" or "lucene", respond exactly: "I can only analyze data when you're in ES|QL mode. Switch to ES|QL from the query bar toggle to use this feature." Do NOT generate, modify, or run queries. Do NOT call any tools. Stop.

### Critical Rules
- ALWAYS read the column names from the attached ES|QL query results BEFORE writing any query. NEVER guess column names — use ONLY the exact column names listed in the attachment. For example, if the attachment lists a column named "@timestamp", use "@timestamp". If it lists "timestamp", use "timestamp". If there is no timestamp column, skip time-based queries.
- ALWAYS format ES|QL queries as esql-tagged code blocks in your response (use triple backticks with "esql" language tag). This ensures the user gets a copy button on each query.
- ALWAYS compose ES|QL queries by following the elasticsearch-esql skill (which covers ES|QL syntax, common patterns, and feature availability). Use the exact column names and index from the attachment. For execution, pass the composed query to executeEsql.
- NEVER call getIndexMapping. All field names and types are already in the ES|QL query results attachment — use those directly.
- NEVER use markdown tables in your responses — they do not render correctly in the chat UI. Use bullet lists or plain text instead.

### Analysis Process
1. FIRST, read the attached ES|QL query results to understand the data: the query text, exact column names, their types, sample values, total result count, and time range.
2. DETERMINE whether the query is already aggregated (contains STATS, COUNT, AVG, SUM, MAX, MIN, or similar aggregation commands) or returns raw documents.
3. Follow the appropriate path below.

#### Path A: Raw document results (no aggregation in query)
The sample rows are only for understanding the schema — do NOT just describe them.
1. Run 2-3 SEPARATE, FOCUSED aggregation queries against the FULL dataset BEFORE writing any analysis. Do NOT run more than 3 — additional queries waste context. For each query, compose ES|QL (per the elasticsearch-esql skill) using the exact column names and index from the attachment, then run it with executeEsql.
2. CRITICAL: Each query must group by ONE field only (at most two). NEVER group by more than 2 fields in a single query — it creates too many rows and wastes tokens. Always use LIMIT 10 on aggregation results to keep output small.
3. Run separate queries for different aspects. Good examples:
   - Response code distribution: STATS count BY response.keyword, sorted, limited to 10
   - Time trend: STATS count BY time bucket, limited to 10
   - Top values of one categorical field: STATS count BY field, sorted desc, limited to 10
4. Present your analysis based on the ACTUAL aggregation results with real numbers.

#### Path B: Aggregated results (query already contains STATS or similar)
The sample rows ARE the actual aggregated results — analyze them directly.
1. Interpret what the aggregation computes and present the results with real numbers from the rows.
2. Highlight patterns, rankings, outliers, or notable distributions visible in the results.
3. Optionally run 1 complementary query to deepen the analysis (compose ES|QL per the elasticsearch-esql skill, then run with executeEsql).

#### Common rules for both paths
- If a query fails, compose a corrected ES|QL query (per the elasticsearch-esql skill) and retry with executeEsql.
- Always present analysis based on ACTUAL results with real numbers.

### Visualizations
IMPORTANT: After running your analysis queries, immediately call the createVisualization tool to render a chart for your most important finding. This is NOT optional — you must call the tool, not describe or suggest a chart. Do not ask the user for permission. Choose the chart type based on the data:
- Time-based trends: line or area chart.
- Categorical distributions: bar chart or pie chart.
Use the same ES|QL query that produced the data you are visualizing.

### Data Freshness
Mention the time range from the attachment in your overview. Do NOT run a separate query for data freshness — it is already provided in the attachment.

### On-Demand Analysis Capabilities
The following analyses should ONLY be performed when the user explicitly asks for them (e.g. "any data quality issues?", "find correlations"). Do NOT run them as part of the default analysis. Always compose ES|QL by following the elasticsearch-esql skill before running queries with executeEsql.
When responding to an on-demand request, return ONLY the requested analysis. Do NOT include the full Response Structure (overview, visualization, drill-down queries) — those are only for the initial "analyze my data" flow.

#### Correlation Discovery (only when asked)
- Cross-tabulate categorical fields to find patterns.
- Check whether values of one field correlate with a numeric field.
- Report only meaningful correlations.

#### Time-over-Time Comparison (only when asked)
When the user asks to compare time periods (e.g. "compare with last week", "how does today compare to yesterday"):
1. Compose a SINGLE ES|QL query (per the elasticsearch-esql skill) that buckets by week (or appropriate period) so both time periods appear in one result. For example: STATS count = COUNT(*) BY BUCKET(@timestamp, 1 week), SORT bucket, LIMIT 10. This avoids running two separate queries.
2. Execute it with executeEsql and compare the buckets: highlight absolute values, differences, and what grew or shrank.
3. Calculate percentage changes yourself in the response text.

#### Field Statistics (only when asked)
When the user asks about field statistics, field distributions, or cardinality (e.g. "show field stats", "what are the top values?"):
1. Identify the key fields from the attachment columns. Do NOT call getIndexMapping — use the column names and types already in the attachment.
2. For categorical/keyword fields: compose an ES|QL query that counts occurrences of each value (STATS count BY field, SORT count DESC, LIMIT 10) and run it with executeEsql. Do NOT try to compute percentages in ES|QL — instead, calculate percentages yourself from the raw counts and the total, and present them in your response text (e.g. "status 200: 12,832 (91.2%)").
3. For numeric fields: compose an ES|QL query that computes MIN, MAX, AVG of the field and run it with executeEsql.
4. For timestamp fields: report the time range (oldest and newest values).
5. Present a concise summary per field. Skip fields that are not useful (e.g. unique IDs, raw text).
6. Do NOT use markdown tables — they do not render well in the chat. Use bullet lists instead (e.g. "- 200: 12,832 (91.2%)").

### Response Structure
IMPORTANT: Your response MUST include ALL of the following sections. Do NOT stop after the visualization. Every section is mandatory.

#### 1. Overview
Summarize what the data represents. Mention total result count and time range.

#### 2. Deep Analysis
Present the results from ALL 2-3 queries you ran (not just one). Include your interpretation: patterns, trends, anomalies, notable findings. Use actual numbers from each query result.

#### 3. Visualization
Call the createVisualization tool here to render a chart for the most important finding. Do not skip this step.

#### 4. Drill-Down Queries
You MUST include this section after the visualization. Write 3 targeted follow-up ES|QL queries directly in esql-tagged code blocks (do NOT call executeEsql for these — they are suggestions, not executed). Each query should drill into a specific finding from your analysis using WHERE clauses:
1. A drill-down into the most interesting pattern or anomaly you found (e.g. filter to the time window where a spike occurred, or to the specific category that dominates the distribution).
2. A correlation or comparison query (e.g. break down a metric by a second field to see if the pattern holds across categories, or compare two time windows).
3. An outlier or edge-case exploration (e.g. filter to extreme values, errors, rare categories, or the tail of a distribution).

Present each query in an esql-tagged code block with a brief explanation of what it investigates and why. Only if the discover_run_query tool is available, tell the user they can ask you to run any of these queries in a new Discover tab. If the tool is not available, do NOT mention this capability.

### Additional Capabilities
- If the discover_run_query tool is available and the user asks to run or open a query in Discover, use it. This opens the query in Discover.`,
  getRegistryTools: () => TOOL_IDS,
});

export const registerSkill = (agentBuilder: AgentBuilderPluginSetup) => {
  agentBuilder.skills.register(discoverDataAnalysisSkill);
};
