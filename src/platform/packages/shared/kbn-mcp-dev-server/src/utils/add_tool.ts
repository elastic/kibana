/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolDefinition, ToolDefinitionInputSchema } from '../types';

export const addTool = <T extends ToolDefinitionInputSchema>(
  server: McpServer,
  tool: ToolDefinition<T>
) => {
  server.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.inputSchema,
    },
    // MCP SDK uses zod/v4/core for SchemaOutput while we use @kbn/zod/v4 - types are structurally
    // compatible but TypeScript treats them as distinct. Cast to satisfy the type checker.
    ((input: z.infer<T>, _extra: unknown) => tool.handler(input)) as Parameters<
      McpServer['registerTool']
    >[2]
  );
};
