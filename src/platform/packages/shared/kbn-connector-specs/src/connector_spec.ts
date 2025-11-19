/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Stack Connectors 2.0 - Minimal TypeScript Specification
 *
 * This is a simplified spec containing only features used by example connectors.
 * For the comprehensive specification, see connector_rfc.ts
 *
 * Key principles:
 * - Single schema (config + secrets together)
 * - Secrets marked with meta.sensitive
 * - Standard auth schemas (reusable)
 * - Zod for validation and UI derivation
 */

import { z } from '@kbn/zod';
import type { Logger } from '@kbn/logging';
import type { LicenseType } from '@kbn/licensing-types';
import type { AxiosInstance } from 'axios';

export { UISchemas } from './connector_spec_ui';

// ============================================================================
// INTERNATIONALIZATION
// ============================================================================

export function createI18nKeys(connectorId: string) {
  const base = `xpack.stackConnectors${connectorId}`;
  return {
    metadata: (key: string) => `${base}.metadata.${key}`,
    config: (key: string) => `${base}.config.${key}`,
    secrets: (key: string) => `${base}.secrets.${key}`,
    actions: (actionName: string, key: string) => `${base}.actions.${actionName}.${key}`,
    validation: (key: string) => `${base}.validation.${key}`,
    test: (key: string) => `${base}.test.${key}`,
  };
}

// ============================================================================
// METADATA
// ============================================================================

export interface ConnectorMetadata {
  id: string;
  displayName: string;
  icon?: string;
  description: string;
  docsUrl?: string;
  minimumLicense: LicenseType;
  supportedFeatureIds: Array<
    | 'alerting'
    | 'cases'
    | 'uptime'
    | 'siem'
    | 'generativeAIForSecurity'
    | 'generativeAIForObservability'
    | 'generativeAIForSearchPlayground'
    | 'endpointSecurity'
    | 'workflows'
  >;
}

// ============================================================================
// STANDARD AUTH SCHEMAS - PHASE 1
// ============================================================================
// Phase 1 supports only: Header, Basic, Bearer
// OAuth2, SSL/mTLS, AWS SigV4 → Phase 2 (see connector_rfc.ts)

/**
 * Header-based authentication (generic)
 * Use for: API keys, custom headers (X-API-Key, etc.)
 */
export const HeaderAuthSchema = z.object({
  method: z.literal('headers'),
  headers: z.record(z.string(), z.string()).describe('Custom Headers'),
});

/**
 * HTTP Basic Authentication
 * Use for: Username + Password auth (Jira, etc.)
 */
export const BasicAuthSchema = z.object({
  method: z.literal('basic'),
  credentials: z.object({
    username: z.string().describe('Username'),
    password: z.string().meta({ sensitive: true }).describe('Password'),
  }),
});

/**
 * Bearer Token Authentication
 * Use for: OAuth tokens, API tokens sent as "Authorization: Bearer <token>"
 */
export const BearerAuthSchema = z.object({
  method: z.literal('bearer'),
  token: z.string().meta({ sensitive: true }).describe('Bearer Token'),
});

// ============================================================================
// PHASE 2 AUTH TYPES (Not supported yet - see connector_rfc.ts)
// ============================================================================
// - OAuth2 (clientId, clientSecret, token refresh)
// - SSL/mTLS (certificate-based authentication)
// - AWS SigV4 (AWS service authentication)
// - Custom (connector-specific auth flows)

// ============================================================================
// ACTIONS
// ============================================================================

export interface ActionDefinition<TInput = unknown, TOutput = unknown, TError = unknown> {
  isTool?: boolean;
  input: z.ZodSchema<TInput>;
  output?: z.ZodSchema<TOutput>;
  error?: z.ZodSchema<TError>;
  handler: (ctx: ActionContext, input: TInput) => Promise<TOutput>;
  description?: string;
  actionGroup?: string;
  supportsStreaming?: boolean;
}

/**
 * Context provided to action handlers
 *
 * Note: The axios client is pre-configured with authentication by the framework.
 * Actions typically don't need to handle auth manually.
 */
export interface ActionContext {
  log: Logger;
  client: AxiosInstance; // Pre-configured with auth, baseURL, headers, etc.
  config?: Record<string, unknown>; // Connector config (non-auth fields)
  connectorUsageCollector?: unknown;
}

// ============================================================================
// TRANSFORMATIONS
// ============================================================================

/**
 * Template rendering for action inputs
 * WHY: Actions need to render user input with context variables (e.g., {{workflow.data}})
 */
export interface TemplateRendering {
  enabled: boolean;
  format?: 'mustache' | 'handlebars' | 'custom';
  escaping?: 'html' | 'json' | 'markdown' | 'none';
}

/**
 * Transformations for Phase 1
 *
 * WHY: Template rendering is connector-level (same for all actions).
 * Request/response processing is action-specific and belongs in action handlers.
 */
export interface Transformations {
  templates?: TemplateRendering;
  // Phase 2: Add interceptors if needed for global request/response transformation
}

// ============================================================================
// TESTING
// ============================================================================

export interface ConnectorTest {
  handler: (ctx: ActionContext) => Promise<{
    ok: boolean;
    message?: string;
    [key: string]: unknown;
  }>;
  description?: string;
}

// ============================================================================
// MAIN CONNECTOR DEFINITION
// ============================================================================

/**
 * Complete connector specification
 *
 * URL Validation: Use Zod's .refine() in schema instead of separate validateUrls field
 * @example
 * schema: z.object({
 *   apiUrl: z.string().url()
 *     .refine((url) => isAllowlisted(url), "URL not in allowlist")
 * })
 */
export interface ConnectorSpec {
  metadata: ConnectorMetadata;

  // Single unified schema for all connector fields (config + secrets)
  // Mark sensitive fields with .meta({ sensitive: true })
  schema: z.ZodSchema;

  actions: Record<string, ActionDefinition>;

  test?: ConnectorTest;

  transformations?: Transformations;
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

export function getActionNames(connector: ConnectorSpec): string[] {
  return Object.keys(connector.actions);
}

export function isToolAction(connector: ConnectorSpec, actionName: string): boolean {
  return connector.actions[actionName]?.isTool ?? false;
}
