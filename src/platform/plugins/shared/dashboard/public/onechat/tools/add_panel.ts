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
import type { GridData } from '@kbn/grid-layout';
import { coreServices } from '../../services/kibana_services';

const addPanelSchema = z.object({
  panel: z
    .object({
      type: z.string().describe('The type of panel (e.g., "lens", "visualization", "map", "markdown")'),
      config: z
        .record(z.unknown())
        .describe('Complete panel configuration object. Must include all required fields for the panel type.'),
      grid: z
        .object({
          x: z.number().describe('X position in grid units (0-23)'),
          y: z.number().describe('Y position in grid units'),
          w: z.number().describe('Width in grid units (1-24)'),
          h: z.number().describe('Height in grid units'),
        })
        .optional()
        .describe('Grid position. If not provided, panel will be automatically placed.'),
      uid: z
        .string()
        .optional()
        .describe('Optional unique ID for the panel. If not provided, a new ID will be generated.'),
    })
    .describe('Complete panel configuration including type, config, and optional grid position'),
});

export function createAddPanelTool(
  dashboardApi: DashboardApi
): BrowserApiToolDefinition<z.infer<typeof addPanelSchema>> {
  return {
    id: 'dashboard_add_panel',
    description: `Adds a new panel to the dashboard.
    
Use this tool when the user wants to add a visualization, chart, or other panel to the dashboard.
You must provide a complete panel configuration including:
- type: The panel type (e.g., "lens", "visualization", "map", "markdown")
- config: The complete panel configuration object with all required fields for that panel type
- grid (optional): Grid position (x, y, w, h). If not provided, panel will be automatically placed.
- uid (optional): Unique panel ID. If not provided, a new ID will be generated.

The config object must contain all required fields for the specified panel type to create a valid panel.`,
    schema: addPanelSchema,
    handler: async ({ panel }) => {
      try {
        const panelPackage: PanelPackage = {
          panelType: panel.type,
          maybePanelId: panel.uid,
          serializedState: {
            rawState: panel.config as Record<string, unknown>,
          } as SerializedPanelState,
        };

        const grid: GridData | undefined = panel.grid
          ? {
              x: panel.grid.x,
              y: panel.grid.y,
              w: panel.grid.w,
              h: panel.grid.h,
            }
          : undefined;

        const result = await dashboardApi.addNewPanel(panelPackage, true, grid);
        
        // Verify panel was actually added
        if (!result) {
          throw new Error(`Failed to add panel: panel type "${panel.type}" may not be valid or panel configuration is incomplete`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        coreServices.notifications.toasts.addDanger({
          title: 'Failed to add panel',
          text: errorMessage,
        });
        throw error;
      }
    },
  };
}

