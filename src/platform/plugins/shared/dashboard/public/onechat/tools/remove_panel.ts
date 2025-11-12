/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BrowserApiToolDefinition } from '@kbn/onechat-browser/tools/browser_api_tool';
import type { DashboardApi } from '../../dashboard_api/types';

const removePanelSchema = z.object({
  panel_id: z.string().describe('The unique ID of the panel to remove from the dashboard'),
});

export function createRemovePanelTool(
  dashboardApi: DashboardApi
): BrowserApiToolDefinition<z.infer<typeof removePanelSchema>> {
  return {
    id: 'dashboard_remove_panel',
    description: `Removes a panel from the dashboard.
    
Use this tool when the user wants to delete a specific panel from the dashboard.
The panel will be permanently removed from the dashboard layout.`,
    schema: removePanelSchema,
    handler: async ({ panel_id }) => {
      dashboardApi.removePanel(panel_id);
    },
  };
}

