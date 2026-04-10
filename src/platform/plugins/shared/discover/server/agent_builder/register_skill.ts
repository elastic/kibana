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
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { DISCOVER_DATA_ANALYSIS_SKILL_ID } from '../../common/agent_builder';

const TOOL_IDS = [
  platformCoreTools.generateEsql,
  platformCoreTools.executeEsql,
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
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

### Critical Rules
- ALWAYS read the column names from the attached ES|QL query results BEFORE writing any query. NEVER guess column names — use ONLY the exact column names listed in the attachment. For example, if the attachment lists a column named "@timestamp", use "@timestamp". If it lists "timestamp", use "timestamp". If there is no timestamp column, skip time-based queries.
- ALWAYS format ES|QL queries as esql-tagged code blocks in your response (use triple backticks with "esql" language tag). This ensures the user gets a copy button on each query.
- When executing queries, ALWAYS use generateEsql first to produce the query, then pass it to executeEsql. Describe what you want in natural language to generateEsql, including the exact column names and index from the attachment. This ensures correct ES|QL syntax. For suggested queries that you present to the user but do NOT execute, you may write them directly in esql-tagged code blocks.

### Analysis Process
1. FIRST, read the attached ES|QL query results to understand the data: the query text, exact column names, their types, sample values, total result count, and time range.
2. DETERMINE whether the query is already aggregated (contains STATS, COUNT, AVG, SUM, MAX, MIN, or similar aggregation commands) or returns raw documents.
3. Follow the appropriate path below.

#### Path A: Raw document results (no aggregation in query)
The sample rows are only for understanding the schema — do NOT just describe them.
1. Run 2-3 aggregation queries against the FULL dataset BEFORE writing any analysis. For each query, use generateEsql to produce the query, then executeEsql to run it. When calling generateEsql, describe what you want in natural language and include the exact column names and index from the attachment.
2. Choose aggregations based on the columns available:
   - Distribution of values across categorical fields
   - Time-based trends if a date column exists
   - Min/max/avg of numeric fields
   - Error rates, status distributions, or top-N rankings
3. Present your analysis based on the ACTUAL aggregation results with real numbers.

#### Path B: Aggregated results (query already contains STATS or similar)
The sample rows ARE the actual aggregated results — analyze them directly.
1. Interpret what the aggregation computes and present the results with real numbers from the rows.
2. Highlight patterns, rankings, outliers, or notable distributions visible in the results.
3. Optionally run 1 complementary query to deepen the analysis (use generateEsql then executeEsql).

#### Common rules for both paths
- If a query fails, use generateEsql to produce a corrected query and retry.
- Always present analysis based on ACTUAL results with real numbers.

### Visualizations
IMPORTANT: After running your analysis queries, immediately call the createVisualization tool to render a chart for your most important finding. This is NOT optional — you must call the tool, not describe or suggest a chart. Do not ask the user for permission. Choose the chart type based on the data:
- Time-based trends: line or area chart.
- Categorical distributions: bar chart or pie chart.
Use the same ES|QL query that produced the data you are visualizing.

### Data Freshness
If a timestamp field exists, include a data freshness check. Use generateEsql to create a query that gets the oldest and newest values of the timestamp field, then run it. Mention the data time span in your overview.

### On-Demand Analysis Capabilities
The following analyses should ONLY be performed when the user explicitly asks for them (e.g. "any data quality issues?", "find correlations"). Do NOT run them as part of the default analysis. Always use generateEsql to produce queries for these analyses.

#### Data Quality Checks (only when asked)
- Check for null values across key fields (hint: in ES|QL, COUNT(field) skips nulls while COUNT(*) counts all rows).
- Check for time gaps in the time distribution.
- Only report noteworthy issues.

#### Correlation Discovery (only when asked)
- Cross-tabulate categorical fields to find patterns.
- Check whether values of one field correlate with a numeric field.
- Report only meaningful correlations.

### Response Structure

#### Overview
Summarize what the data represents. Mention total result count and time range.

#### Deep Analysis
Present the results and your interpretation: patterns, trends, anomalies, notable findings. Use actual numbers. For aggregated queries, analyze the results directly. For raw documents, analyze the aggregation results you ran.

#### Visualization
Call the createVisualization tool here to render a chart for the most important finding. Do not skip this step.

#### Drill-Down Queries
Based on your findings, generate 3 targeted follow-up ES|QL queries using the generateEsql tool. Each query should drill into a specific finding from your analysis using WHERE clauses:
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
