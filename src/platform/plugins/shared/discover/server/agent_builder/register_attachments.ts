/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { ESQL_QUERY_RESULTS_ATTACHMENT_TYPE } from '../../common/agent_builder';

const columnSchema = z.object({
  name: z.string(),
  type: z.string(),
});

const timeRangeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

const esqlQueryResultsDataSchema = z.object({
  query: z.string(),
  columns: z.array(columnSchema),
  sampleRows: z.array(z.record(z.string(), z.unknown())),
  totalHits: z.number(),
  timeRange: timeRangeSchema.optional(),
});

type EsqlQueryResultsData = z.infer<typeof esqlQueryResultsDataSchema>;

const isEsqlQueryResultsData = (data: unknown): data is EsqlQueryResultsData => {
  return esqlQueryResultsDataSchema.safeParse(data).success;
};

const createEsqlQueryResultsAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: ESQL_QUERY_RESULTS_ATTACHMENT_TYPE,
    validate: (input) => {
      const parseResult = esqlQueryResultsDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment: Attachment<string, unknown>) => {
      const data = attachment.data;
      if (!isEsqlQueryResultsData(data)) {
        throw new Error(
          `Invalid ES|QL query results attachment data for attachment ${attachment.id}`
        );
      }
      return {
        getRepresentation: () => {
          return { type: 'text' as const, value: formatQueryResultsData(data) };
        },
      };
    },
    getTools: () => [platformCoreTools.generateEsql, platformCoreTools.executeEsql],
    getAgentDescription: () => {
      return `You have access to ES|QL query results from Kibana Discover. The attachment includes the query, column metadata, a small sample of rows, the total result count, and the time range.

IMPORTANT: The sample rows are only provided to help you understand the data schema and value formats. They are NOT sufficient for statistical analysis. To identify real patterns, trends, and anomalies, you MUST run aggregation queries against the full dataset using the executeEsql tool.

Structure your response as follows:

## Overview
Summarize what the data represents based on the query, columns, and sample values. Mention the total result count and time range if available.

## Deep Analysis
Proactively run 2-3 aggregation queries using the executeEsql tool to analyze the full dataset. Choose queries based on what would be most insightful for this data — for example:
- Distribution of values across key categorical fields (STATS COUNT(*) BY field)
- Time-based trends if a timestamp field exists (STATS ... BY BUCKET(@timestamp, ...))
- Min/max/avg of numeric fields
- Error rates, status distributions, or top-N rankings

Present the results of each query with your interpretation of what they reveal: patterns, trends, anomalies, or notable findings.

## Suggested Queries
After your analysis, suggest exactly 3 additional ES|QL queries using the generateEsql tool for the user to explore further. Each should have a different analytical focus:
1. An aggregation query (using STATS with COUNT, AVG, SUM, etc.)
2. A filtering/drill-down query (using WHERE to explore interesting subsets)
3. A time-based analysis query (using STATS ... BY BUCKET(@timestamp, ...) to show trends over time). If no timestamp field is present, replace this with a top-N ranking or cross-field comparison.

For each suggested query, call the generateEsql tool with a natural language description of what the query should do. Include the source index from the original query in your description.

## Opening Queries in Discover
If the user asks to open a query in Discover (e.g. "open query 2 in Discover"), use the discover_open_esql_query_in_new_tab tool to open it in a new Discover tab. After listing your suggested queries, let the user know they can ask you to open any of them in Discover.`;
    },
  };
};

const formatQueryResultsData = (data: EsqlQueryResultsData): string => {
  const lines: string[] = [];

  lines.push(`ES|QL Query: ${data.query}`);
  lines.push(`Total Results: ${data.totalHits}`);
  if (data.timeRange) {
    lines.push(`Time Range: ${data.timeRange.from} to ${data.timeRange.to}`);
  }
  lines.push('');

  lines.push('Columns:');
  for (const col of data.columns) {
    lines.push(`  - ${col.name} (${col.type})`);
  }
  lines.push('');

  lines.push(`Sample Rows (${data.sampleRows.length} of ${data.totalHits}):`);
  for (const row of data.sampleRows) {
    const entries = Object.entries(row)
      .map(([key, val]) => {
        const strVal = typeof val === 'string' ? val : JSON.stringify(val);
        const truncated = strVal && strVal.length > 100 ? strVal.substring(0, 100) + '...' : strVal;
        return `${key}: ${truncated}`;
      })
      .join(', ');
    lines.push(`  { ${entries} }`);
  }

  return lines.join('\n');
};

export const registerAttachments = (agentBuilder: AgentBuilderPluginSetup) => {
  agentBuilder.attachments.registerType(createEsqlQueryResultsAttachmentType());
};
