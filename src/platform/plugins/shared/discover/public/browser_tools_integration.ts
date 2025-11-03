/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OnechatPluginStart } from '@kbn/onechat-plugin/public';
import type { BrowserApiToolDefinition } from '@kbn/onechat-browser/tools/browser_api_tool';
import { z } from '@kbn/zod';

/**
 * Trigger a Discover state update via custom event
 * This is a fallback approach when direct API access isn't available
 */
function triggerDiscoverAction(action: string, payload: unknown) {

}

/**
 * Register browser API tools for Discover integration
 * These tools demonstrate how Discover can expose functionality to AI agents
 *
 * NOTE: Full implementation would require:
 * 1. Access to Discover's state container
 * 2. Access to data plugin services
 * 3. Access to dataViews plugin
 * 4. Proper error handling and validation
 *
 * @returns Array of browser tool definitions for use in setConversationFlyoutActiveConfig
 */
export function registerDiscoverBrowserTools(
  onechat: OnechatPluginStart
): Array<BrowserApiToolDefinition<any>> {
  const tools: Array<BrowserApiToolDefinition<any>> = [];

  // Example tool 1: Show field statistics
  const showFieldStatisticsTool: BrowserApiToolDefinition<any> = {
    id: 'show_field_statistics',
    type: 'builtin',
    description: 'Display field statistics for a selected field in the Discover field sidebar',
    schema: z.object({
      fieldName: z.string().describe('Name of the field to show statistics for'),
    }),
    handler: async ({ fieldName }) => {
      console.log('🔍 Show field statistics for:', fieldName);
      alert(`Tool called: Show field statistics for "${fieldName}"`);

      return {
        results: [
          {
            type: 'other' as const,
            data: {
              message: `Field statistics displayed for: ${fieldName}`,
              action: 'show_field_statistics',
              field: fieldName,
            },
          },
        ],
      };
    },
  };
  tools.push(showFieldStatisticsTool);

  // Tool 2: Add field as column
  const addFieldColumnTool: BrowserApiToolDefinition<any> = {
    id: 'add_field_column',
    description: 'Add a field as a column to the Discover document table',
    schema: z.object({
      fieldName: z.string().describe('Name of the field to add as a column'),
    }),
    handler: async ({ fieldName }) => {
      console.log('[Discover Browser Tool] Add field as column:', fieldName);

      // Trigger custom event for Discover to handle
      triggerDiscoverAction('add_column', {
        fieldName,
      });

      console.log(`Added column: ${fieldName}`);
    },
  };
  tools.push(addFieldColumnTool);

  // Tool 3: Filter for value
  // This demonstrates triggering Discover actions via custom events
  const filterForValueTool: BrowserApiToolDefinition<any> = {
    id: 'filter_for_value',
    description: 'Add a filter to show only documents where a field matches a specific value',
    schema: z.object({
      fieldName: z.string().describe('Name of the field to filter'),
      value: z.union([z.string(), z.number(), z.boolean()]).describe('Value to filter for'),
    }),
    handler: async ({ fieldName, value }) => {
      console.log('[Discover Browser Tool] Filter for value:', fieldName, '=', value);

      // Trigger custom event for Discover to handle
      // NOTE: Discover would need to listen for this event and add the filter
      triggerDiscoverAction('add_filter', {
        fieldName,
        value,
        operation: 'is', // filter for (positive filter)
      });

      // For development/demo, also show a toast notification
      console.log(`Added filter: ${fieldName} = ${value}`);
    },
  };
  tools.push(filterForValueTool);

  // Tool 4: Change time range
  // This tool demonstrates how to update time range in Discover
  const setTimeRangeTool: BrowserApiToolDefinition<any> = {
    id: 'set_time_range',
    description: 'Change the time range for the Discover search',
    schema: z.object({
      from: z.string().describe('Start time (e.g., "now-15m", "now-1h", "now-24h", or ISO date)'),
      to: z.string().describe('End time (e.g., "now" or ISO date)'),
    }),
    handler: async ({ from, to }) => {
      console.log('[Discover Browser Tool] Set time range:', from, 'to', to);

      // Trigger custom event for Discover to handle
      // Discover would update the timefilter service
      triggerDiscoverAction('set_time_range', {
        from,
        to,
      });

      console.log(`Time range set: ${from} to ${to}`);
    },
  };
  tools.push(setTimeRangeTool);

  // Example tool 5: Expand document
  const expandDocumentTool: BrowserApiToolDefinition<any> = {
    id: 'expand_document',
    type: 'builtin',
    description: 'Expand a document in the Discover table to see all its fields',
    schema: z.object({
      documentId: z.string().describe('ID of the document to expand'),
    }),
    handler: async ({ documentId }) => {
      console.log('📄 Expand document:', documentId);
      alert(`Tool called: Expand document "${documentId}"`);

      return {
        results: [
          {
            type: 'other' as const,
            data: {
              message: `Document expanded: ${documentId}`,
              action: 'expand_document',
              documentId,
            },
          },
        ],
      };
    },
  };
  tools.push(expandDocumentTool);

  // Example tool 6: Navigate to context view
  const showContextTool: BrowserApiToolDefinition<any> = {
    id: 'show_context',
    type: 'builtin',
    description: 'Navigate to the context view to see documents surrounding a specific document',
    schema: z.object({
      documentId: z.string().describe('ID of the anchor document'),
      contextSize: z.number().default(5).describe('Number of documents to show before and after'),
    }),
    handler: async ({ documentId, contextSize }) => {
      console.log('🔄 Show context for document:', documentId, 'with size:', contextSize);
      alert(`Tool called: Show context for document "${documentId}" (±${contextSize} documents)`);

      return {
        results: [
          {
            type: 'other' as const,
            data: {
              message: `Context view opened for document: ${documentId}`,
              action: 'show_context',
              documentId,
              contextSize,
            },
          },
        ],
      };
    },
  };
  tools.push(showContextTool);

  return tools;
}
