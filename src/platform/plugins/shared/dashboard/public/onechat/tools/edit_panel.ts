/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BrowserApiToolDefinition } from '@kbn/onechat-browser/tools/browser_api_tool';
import type { DashboardApi } from '../../dashboard_api/types';
import type { PanelPackage } from '@kbn/presentation-containers';
import type { SerializedPanelState } from '@kbn/presentation-publishing';

const editPanelSchema = z.object({
  panel_id: z.string().describe('The unique ID of the panel to edit'),
  updates: z
    .record(z.unknown())
    .describe('Object containing the updates to apply to the panel (title, description, config, etc.)'),
});

export function createEditPanelTool(
  dashboardApi: DashboardApi
): BrowserApiToolDefinition<z.infer<typeof editPanelSchema>> {
  return {
    id: 'dashboard_edit_panel',
    description: `Edits an existing panel in the dashboard.
    
Use this tool when the user wants to modify a panel's configuration, title, description, or other properties.
The panel will be updated with the provided changes while maintaining its position and ID.`,
    schema: editPanelSchema,
    handler: async ({ panel_id, updates }) => {
      try {
        // Get current panel state
        const panelData = dashboardApi.getDashboardPanelFromId(panel_id);
        const currentType = panelData.type;
        const currentGrid = panelData.grid;

        // Merge updates with existing panel config
        const currentConfig = (panelData.serializedState.rawState as Record<string, unknown>) ?? {};
        const updatedConfig = {
          ...currentConfig,
          ...updates,
        };

        const panelPackage: PanelPackage = {
          panelType: currentType,
          serializedState: {
            rawState: updatedConfig,
          } as SerializedPanelState,
        };

        // Replace the panel with updated configuration
        await dashboardApi.replacePanel(panel_id, panelPackage);
      } catch (error) {
        throw new Error(`Failed to edit panel: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  };
}

