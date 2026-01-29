/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

/**
 * Authentication types supported by the MCP connector.
 */
export const MCPAuthType = {
  None: 'none',
  Bearer: 'bearer',
  ApiKey: 'apiKey',
  Basic: 'basic',
} as const;

/**
 * Schema for MCP connector configuration.
 *
 * Flat structure following standard Kibana connector patterns.
 */
export const MCPConnectorConfigSchema = z.object({
  /**
   * The URL of the MCP server endpoint.
   */
  serverUrl: z.string(),
  /**
   * Whether authentication is required. Defaults to true.
   */
  hasAuth: z.boolean().default(true),
  /**
   * Authentication type to use when hasAuth is true.
   */
  authType: z
    .enum([MCPAuthType.None, MCPAuthType.Bearer, MCPAuthType.ApiKey, MCPAuthType.Basic])
    .optional(),
  /**
   * Custom header name for API key authentication.
   * Defaults to 'X-API-Key' if not specified.
   * Only used when authType is 'apiKey'.
   */
  apiKeyHeaderName: z.string().min(1).optional(),
  /**
   * Non-sensitive HTTP headers to include in requests.
   */
  headers: z.record(z.string(), z.string()).optional(),
});

/**
 * Schema for MCP connector secrets.
 *
 * Flat structure with optional fields based on auth type.
 */
export const MCPConnectorSecretsSchema = z.object({
  /**
   * Bearer token for 'bearer' auth type.
   */
  token: z.string().optional(),
  /**
   * API key for 'apiKey' auth type.
   */
  apiKey: z.string().optional(),
  /**
   * Username for 'basic' auth type.
   */
  user: z.string().optional(),
  /**
   * Password for 'basic' auth type.
   */
  password: z.string().optional(),
  /**
   * Sensitive HTTP headers to include in requests.
   */
  secretHeaders: z.record(z.string(), z.string()).optional(),
});

// Sub-action schemas

export const TestConnectorRequestSchema = z.object({}).strict();

export const ListToolsRequestSchema = z.object({
  forceRefresh: z.boolean().optional(),
});

export const CallToolRequestSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.any()).optional(),
});
