/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BrowserApiToolDefinition } from '@kbn/onechat-browser/tools/browser_api_tool';
import type { DashboardApi } from '../../dashboard_api/types';
import type { TimeRange } from '@kbn/es-query';

const changeTimerangeSchema = z.object({
  from: z.string().describe('Start time for the time range (e.g., "now-15m", "2024-01-01T00:00:00Z")'),
  to: z.string().describe('End time for the time range (e.g., "now", "2024-01-02T00:00:00Z")'),
});

export function createChangeTimerangeTool(
  dashboardApi: DashboardApi
): BrowserApiToolDefinition<z.infer<typeof changeTimerangeSchema>> {
  return {
    id: 'dashboard_change_timerange',
    description: `Changes the time range for the dashboard.
    
Use this tool when the user wants to modify the time range that controls what data is displayed in all panels.
The time range can use relative expressions like "now-15m" or absolute timestamps.`,
    schema: changeTimerangeSchema,
    handler: async ({ from, to }) => {
      const timeRange: TimeRange = {
        from,
        to,
      };
      dashboardApi.setTimeRange(timeRange);
    },
  };
}

