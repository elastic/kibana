/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const ListToolsInputSchema = lazySchema(() => z.object({}));
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;

export const CallToolInputSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .describe(
        'Name of the MCP tool to call on the configured MCP server. Use the listTools action first to discover available tool names. Example: "search".'
      ),
    arguments: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        "Arguments to pass to the tool as a key-value object. The required and optional keys depend on the specific tool being called; use listTools to see each tool's parameter schema."
      ),
  })
);
export type CallToolInput = z.infer<typeof CallToolInputSchema>;
