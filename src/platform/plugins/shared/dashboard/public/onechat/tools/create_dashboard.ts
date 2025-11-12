/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BrowserApiToolDefinition } from '@kbn/onechat-browser/tools/browser_api_tool';
import type { CoreStart } from '@kbn/core/public';
import { DASHBOARD_APP_ID } from '../../../common/constants';

const createDashboardSchema = z.object({
  title: z.string().describe('The title of the new dashboard'),
  description: z
    .string()
    .optional()
    .describe('Optional description for the new dashboard'),
  panels: z
    .array(
      z.object({
        type: z.string().describe('Panel type (e.g., "lens", "visualization")'),
        config: z.record(z.unknown()).optional().describe('Panel configuration'),
      })
    )
    .optional()
    .describe('Optional array of panels to include in the new dashboard'),
});

export function createCreateDashboardTool(
  coreStart: CoreStart
): BrowserApiToolDefinition<z.infer<typeof createDashboardSchema>> {
  return {
    id: 'dashboard_create',
    description: `Creates a new dashboard.
    
Use this tool when the user wants to create a brand new dashboard.
This will navigate to a new dashboard creation page where the user can add panels and configure the dashboard.
After creation, the user can save the dashboard with a title and description.`,
    schema: createDashboardSchema,
    handler: async ({ title, description, panels }) => {
      // Navigate to dashboard creation page
      await coreStart.application.navigateToApp(DASHBOARD_APP_ID, {
        path: '#/create',
        state: {
          title,
          description,
          panels: panels?.map((panel) => ({
            type: panel.type,
            config: panel.config ?? {},
          })),
        },
      });
    },
  };
}

