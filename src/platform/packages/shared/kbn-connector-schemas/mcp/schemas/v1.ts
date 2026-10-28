/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

/**
 * Authentication types supported by the MCP connector.
 */
export const MCPAuthType = {
  None: 'none',
  Bearer: 'bearer',
  ApiKey: 'apiKey',
  Basic: 'basic',
  OAuthAuthorizationCode: 'oauth_authorization_code',
} as const;

/** Bound for OAuth URL, client id, and scope strings stored on the MCP connector. */
export const MCP_OAUTH_FIELD_MAX_LENGTH = 2048;

/** Bound for the OAuth client secret stored on the MCP connector. */
export const MCP_OAUTH_CLIENT_SECRET_MAX_LENGTH = 4096;

/** Placeholder in apiKeyHeaderValue template replaced by secrets.apiKey */
export const API_KEY_PLACEHOLDER = '{{apiKey}}';

/**
 * Schema for MCP connector configuration.
 *
 * Flat structure following standard Kibana connector patterns.
 */
export const MCPConnectorConfigSchema = lazySchema(() =>
  z.object({
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
      .enum([
        MCPAuthType.None,
        MCPAuthType.Bearer,
        MCPAuthType.ApiKey,
        MCPAuthType.Basic,
        MCPAuthType.OAuthAuthorizationCode,
      ])
      .optional(),
    /**
     * OAuth 2.0 authorization endpoint.
     * Used only when authType is 'oauth_authorization_code'.
     */
    authorizationUrl: z.string().max(MCP_OAUTH_FIELD_MAX_LENGTH).optional(),
    /**
     * OAuth 2.0 token endpoint.
     * Used only when authType is 'oauth_authorization_code'.
     */
    tokenUrl: z.string().max(MCP_OAUTH_FIELD_MAX_LENGTH).optional(),
    /**
     * OAuth client id.
     * Used only when authType is 'oauth_authorization_code'.
     */
    clientId: z.string().max(MCP_OAUTH_FIELD_MAX_LENGTH).optional(),
    /**
     * OAuth scope sent on the authorize and token requests.
     * Used only when authType is 'oauth_authorization_code'.
     */
    scope: z.string().max(MCP_OAUTH_FIELD_MAX_LENGTH).optional(),
    /**
     * Custom header name for API key authentication.
     * Defaults to 'X-API-Key' if not specified.
     * Only used when authType is 'apiKey'.
     */
    apiKeyHeaderName: z.string().min(1).optional(),
    /**
     * When authType is 'apiKey': optional value template. {{apiKey}} is replaced by secrets.apiKey.
     * When omitted, the header value is the raw apiKey.
     */
    apiKeyHeaderValue: z.string().optional(),
    /**
     * Non-sensitive HTTP headers to include in requests.
     */
    headers: z.record(z.string(), z.string()).optional(),
  })
);

/**
 * Schema for MCP connector secrets.
 *
 * Flat structure with optional fields based on auth type.
 */
export const MCPConnectorSecretsSchema = lazySchema(() =>
  z.object({
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
     * OAuth client secret.
     * Used only when authType is 'oauth_authorization_code'.
     */
    clientSecret: z.string().max(MCP_OAUTH_CLIENT_SECRET_MAX_LENGTH).optional(),
    /**
     * Sensitive HTTP headers to include in requests.
     */
    secretHeaders: z.record(z.string(), z.string()).optional(),
  })
);

// Sub-action schemas

export const TestConnectorRequestSchema = lazySchema(() => z.object({}).strict());

export const ListToolsRequestSchema = lazySchema(() =>
  z.object({
    forceRefresh: z.boolean().optional(),
  })
);

export const CallToolRequestSchema = lazySchema(() =>
  z.object({
    name: z.string(),
    arguments: z.record(z.string(), z.any()).optional(),
  })
);
