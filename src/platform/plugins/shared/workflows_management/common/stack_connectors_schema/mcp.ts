/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/**
 * These schemas were copied from Zod v3 schemas in src/platform/packages/shared/kbn-connector-schemas/mcp/schemas/v1.ts
 * and will be deprecated once kbn-connector-schemas will switch to Zod v4 or
 * the MCP connector will be refactored as a single-file connector.
 */

// Input/Params Schemas
export const McpTestParamsSchema = z.object({}).strict();
export const McpListToolsParamsSchema = z.object({
  forceRefresh: z.boolean().optional(),
});
export const McpCallToolParamsSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.any()).optional(),
});

// Response/Output Schemas

/**
 * Metadata about the provider of a tool.
 * Used for attribution, audit trails, and UI display.
 */
export const ToolProviderMetadataSchema = z.object({
  /** Provider identifier (e.g., 'mcp.github') */
  id: z.string(),
  /** Human-readable provider name (e.g., 'GitHub MCP Server') */
  name: z.string(),
  /** Provider type constant */
  type: z.literal('mcp'),
  /** Unique ID of the MCP connector (from config.uniqueId) */
  uniqueId: z.string(),
  /** Optional description of when to use this MCP server (for LLM context) */
  description: z.string().optional(),
});

/**
 * A text content as part of a tool call response.
 */
export const TextPartSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

/**
 * Non-text content as part of a tool call response.
 */
export const NonTextPartSchema = z
  .object({
    type: z.string(),
  })
  .loose();

/**
 * Content part - either text or non-text content.
 */
export const ContentPartSchema = z.union([TextPartSchema, NonTextPartSchema]);

/**
 * Response from calling a tool on the MCP client.
 */
export const McpCallToolResponseSchema = z.object({
  content: z.array(ContentPartSchema),
  /**
   * Optional provider metadata for attribution and audit trails.
   * Included in tool execution results for tracking and logging.
   */
  provider: ToolProviderMetadataSchema.optional(),
});

/**
 * A tool available on the MCP client.
 */
export const ToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z.record(z.string(), z.any()),
  /**
   * Optional provider metadata for attribution and audit trails.
   * When present, indicates the source of the tool (e.g., which MCP connector).
   */
  provider: ToolProviderMetadataSchema.optional(),
});

/**
 * Response from listing the tools available on the MCP client.
 */
export const McpListToolsResponseSchema = z.object({
  /** The tools available on the MCP client. */
  tools: z.array(ToolSchema),
});

/**
 * Response from testing the MCP connection.
 */
export const McpTestResponseSchema = z.object({
  connected: z.boolean(),
  capabilities: z.record(z.string(), z.any()).optional(),
});
