/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BrowserApiToolDefinition } from '@kbn/onechat-browser/tools/browser_api_tool';
import type { DashboardApi } from '../../dashboard_api/types';
import type { Filter } from '@kbn/es-query';

const changeFiltersSchema = z.object({
  filters: z
    .array(z.record(z.unknown()))
    .nullish()
    .default([])
    .describe('Array of filter objects to apply to the dashboard. Each filter should have meta.key, meta.value, and other filter properties. If empty array is provided or omitted, all filters will be removed.'),
});

export function createChangeFiltersTool(
  dashboardApi: DashboardApi
): BrowserApiToolDefinition<z.infer<typeof changeFiltersSchema>> {
  return {
    id: 'dashboard_change_filters',
    description: `Changes the filters applied to the dashboard.
    
Use this tool when the user wants to add, remove, or modify filters on the dashboard.
Filters control which data is displayed in all panels on the dashboard.
Provide an array of filter objects with properties like meta.key, meta.value, meta.negate, etc.`,
    schema: changeFiltersSchema,
    handler: async ({ filters }) => {
      // Convert the filter objects to Filter type
      // filters will be [] if undefined/null due to .default([]) in schema
      const dashboardFilters = (filters ?? []) as Filter[];
      dashboardApi.setFilters(dashboardFilters);
    },
  };
}

