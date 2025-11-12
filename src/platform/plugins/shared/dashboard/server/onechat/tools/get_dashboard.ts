/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { AgentHandlerContext } from '@kbn/onechat-server';
import type { SavedObjectsServiceStart } from '@kbn/core/server';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../dashboard_saved_object';
import { savedObjectToItem } from '../../content_management/v1/transform_utils';

const getDashboardSchema = z.object({
  dashboard_id: z.string().describe('The ID of the dashboard to retrieve'),
});

export const getDashboardTool = (
  savedObjects: SavedObjectsServiceStart
): BuiltinToolDefinition<typeof getDashboardSchema> => {
  return {
    id: 'platform.dashboard.get_dashboard',
    type: ToolType.builtin,
    description: `Retrieves the full raw dashboard configuration object (JSON) by its ID.
    
This tool returns the complete dashboard state as a JSON object including:
- Dashboard attributes (title, description, panels, filters, timeRange, etc.)
- References to related saved objects
- Metadata (id, type, timestamps, version, etc.)

The returned data structure matches the dashboard saved object format and can be used to understand the exact dashboard configuration or to programmatically modify dashboards.

Use this tool when you need to access the raw dashboard data structure for analysis or modification.`,
    schema: getDashboardSchema,
    handler: async (
      { dashboard_id },
      { request, logger }: AgentHandlerContext
    ) => {
      logger.debug(`get_dashboard tool called with dashboard_id: ${dashboard_id}`);

      try {
        // Get saved objects client scoped to the request
        const savedObjectsClient = savedObjects.getScopedClient(request);

        // Resolve dashboard (handles aliases)
        const resolveResult = await savedObjectsClient.resolve(
          DASHBOARD_SAVED_OBJECT_TYPE,
          dashboard_id
        );

        if (!resolveResult.saved_object) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error: 'Dashboard not found',
                  message: `Dashboard with ID "${dashboard_id}" does not exist.`,
                },
              },
            ],
          };
        }

        // Convert saved object to dashboard item
        const conversionResult = savedObjectToItem(resolveResult.saved_object, false);
        if (!conversionResult) {
          logger.error('savedObjectToItem returned undefined');
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error: 'Invalid dashboard data',
                  message: 'Failed to convert dashboard saved object',
                },
              },
            ],
          };
        }

        const { item, error: itemError } = conversionResult;
        if (itemError) {
          logger.error(`Error converting dashboard saved object: ${itemError instanceof Error ? itemError.message : String(itemError)}`);
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error: 'Invalid dashboard data',
                  message: itemError instanceof Error ? itemError.message : String(itemError),
                },
              },
            ],
          };
        }

        if (!item) {
          logger.error('savedObjectToItem returned null item');
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error: 'Invalid dashboard data',
                  message: 'Dashboard item is null',
                },
              },
            ],
          };
        }

        // Return raw dashboard object as JSON
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                dashboard_id: dashboard_id,
                dashboard: item.attributes,
                references: item.references,
                metadata: {
                  id: item.id,
                  type: item.type,
                  updated_at: item.updatedAt,
                  updated_by: item.updatedBy,
                  created_at: item.createdAt,
                  created_by: item.createdBy,
                  version: item.version,
                  managed: item.managed,
                  namespaces: item.namespaces,
                },
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error retrieving dashboard: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                error: 'Failed to retrieve dashboard',
                message: error instanceof Error ? error.message : String(error),
              },
            },
          ],
        };
      }
    },
    tags: ['dashboard', 'visualization'],
  };
};

