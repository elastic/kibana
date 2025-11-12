/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BrowserApiToolDefinition } from '@kbn/onechat-browser/tools/browser_api_tool';
import type { DashboardApi } from '../../dashboard_api/types';
import type { Query, AggregateQuery } from '@kbn/es-query';

const setQuerySchema = z.object({
  query: z
    .union([
      z.object({
        query: z.string().describe('The query string (e.g., KQL query or Lucene query)'),
        language: z.string().describe('The query language (e.g., "kuery" for KQL or "lucene" for Lucene)'),
      }),
      z.object({
        esql: z.string().describe('ESQL query string'),
      }),
    ])
    .nullish()
    .default(undefined)
    .describe('Query object to set on the dashboard. Can be a KQL/Lucene query with query and language properties, or an ESQL query with esql property. If omitted or null, clears the query.'),
});

export function createSetQueryTool(
  dashboardApi: DashboardApi
): BrowserApiToolDefinition<z.infer<typeof setQuerySchema>> {
  return {
    id: 'dashboard_set_query',
    description: `Sets the query applied to the dashboard.
    
Use this tool when the user wants to change the search query on the dashboard.
The query controls which data is displayed in all panels on the dashboard.

You can provide:
- A KQL query: { query: "field:value", language: "kuery" }
- A Lucene query: { query: "field:value", language: "lucene" }
- An ESQL query: { esql: "FROM index | WHERE field = 'value'" }
- null/undefined to clear the query`,
    schema: setQuerySchema,
    handler: async ({ query }) => {
      if (!query) {
        // Clear the query
        dashboardApi.setQuery(undefined);
        return;
      }

      // Convert to Query or AggregateQuery type
      // The dashboard API accepts Query, but AggregateQuery (ESQL) should also work
      const dashboardQuery = query as Query | AggregateQuery;
      dashboardApi.setQuery(dashboardQuery as Query);
    },
  };
}

