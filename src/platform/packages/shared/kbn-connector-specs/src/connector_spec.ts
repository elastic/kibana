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
 * - Standard auth types
 * - Secrets marked with meta.sensitive
 * - Standard auth schemas (reusable)
 * - Zod for validation and UI derivation
 */

import type { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/logging';
import type { CustomHostSettings, ProxySettings, SSLSettings } from '@kbn/actions-utils';
import type { LicenseType } from '@kbn/licensing-types';
import type { AxiosHeaderValue, AxiosInstance } from 'axios';

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
  isTechnicalPreview?: boolean;
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
    | 'agentBuilder'
  >;
}

// ============================================================================
// STANDARD AUTH SCHEMAS - PHASE 1
// ============================================================================
// Phase 1 supports only: Header, Basic, Bearer
// OAuth2, SSL/mTLS, AWS SigV4 → Phase 2 (see connector_rfc.ts)

// Auth schemas defined in ./auth_types
export interface OAuthGetTokenOpts {
  authType: 'oauth';
  tokenUrl: string;
  scope?: string;
  clientId: string;
  clientSecret: string;
  additionalFields?: Record<string, unknown>;
  tokenEndpointAuthMethod?: 'client_secret_post' | 'client_secret_basic';
  accessTokenPath?: string;
  tokenTypePath?: string;
  tokenType?: string;
}

export interface EarsGetTokenOpts {
  authType: 'ears';
  provider: string;
  scope?: string;
}

export type GetTokenOpts = OAuthGetTokenOpts | EarsGetTokenOpts;

export interface AuthContext {
  getCustomHostSettings: (url: string) => CustomHostSettings | undefined;
  getToken: (opts: GetTokenOpts) => Promise<string | null>;
  logger: Logger;
  proxySettings?: ProxySettings;
  sslSettings: SSLSettings;
}

export type AuthMode = 'per-user' | 'shared';

export interface AuthTypeSpec<T extends Record<string, unknown>> {
  id: string;
  schema: z.ZodObject<Record<string, z.ZodType>>;
  normalizeSchema?: (defaults?: Record<string, unknown>) => z.ZodObject<Record<string, z.ZodType>>;
  configure: (ctx: AuthContext, axiosInstance: AxiosInstance, secret: T) => Promise<AxiosInstance>;
  authMode?: AuthMode;
}

export type NormalizedAuthType = AuthTypeSpec<Record<string, unknown>>;

// ============================================================================
// PHASE 2 AUTH TYPES (Not supported yet - see connector_rfc.ts)
// ============================================================================
// - OAuth2 (clientId, clientSecret, token refresh)
// - SSL/mTLS (certificate-based authentication)
// - Custom (connector-specific auth flows)

// ============================================================================
// POLICIES
// ============================================================================

export const RETRY_RATE_LIMIT = [429, 503] as const;
export const RETRY_SERVER_ERRORS = [500, 502, 503, 504] as const;
export const RETRY_GATEWAY_ERRORS = [502, 503, 504] as const;
export const RETRY_TIMEOUT_AND_RATE_LIMIT = [408, 429, 503] as const;

export interface RateLimitPolicy {
  strategy: 'header' | 'status_code' | 'response_body';
  codes?: number[];
  remainingHeader?: string;
  resetHeader?: string;
  bodyPath?: string;
}

export interface PaginationPolicy {
  strategy: 'cursor' | 'offset' | 'link_header' | 'none';
  parameterLocation?: 'query_params' | 'headers' | 'body';
  resultPath?: string;
  cursorParam?: string;
  cursorPath?: string;
  offsetParam?: string;
  limitParam?: string;
  linkHeaderName?: string;
  pageSizeParam?: string;
  defaultPageSize?: number;
}

export interface RetryPolicy {
  retryOnStatusCodes?: number[];
  customRetryCondition?: (error: {
    status?: number;
    message?: string;
    response?: unknown;
  }) => boolean;
  maxRetries?: number;
  backoffStrategy?: 'exponential' | 'linear' | 'fixed';
  initialDelay?: number;
}

export interface ErrorPolicy {
  classifyError?: (error: { status?: number; message?: string }) => 'user' | 'system' | 'unknown';
  userErrorCodes?: number[];
  systemErrorCodes?: number[];
}

export interface StreamingPolicy {
  enabled: boolean;
  mechanism?: 'sse' | 'chunked' | 'websocket';
  parser?: 'ndjson' | 'json' | 'text' | 'custom';
}

export interface ConnectorPolicies {
  rateLimit?: RateLimitPolicy;
  pagination?: PaginationPolicy;
  retry?: RetryPolicy;
  error?: ErrorPolicy;
  streaming?: StreamingPolicy;
}

// ============================================================================
// ACTIONS
// ============================================================================

export interface ConnectorActionErrorMeta {
  /**
   * Raw/provider-declared response size in bytes, for example `content-length`
   * or a provider metadata field.
   */
  contentLengthBytes?: number;
  /**
   * Estimated size in bytes of the connector action output after transformation
   * (for example, base64 expansion).
   */
  estimatedOutputBytes?: number;
}

const connectorActionErrorMeta = new WeakMap<object, ConnectorActionErrorMeta>();

/** Parses a value as a finite non-negative number. Returns `undefined` for NaN, Infinity, negatives, or non-numeric types. Accepts string representations. */
export const getFinitePositiveNumber = (value: unknown): number | undefined => {
  const numericValue = typeof value === 'string' ? Number(value) : value;
  if (typeof numericValue !== 'number' || !Number.isFinite(numericValue) || numericValue < 0) {
    return undefined;
  }
  return numericValue;
};

// Safe upper bound for the JSON envelope (status, headers, key names, etc.)
// that wraps content in step output. Actual envelope is a few hundred bytes.
export const ESTIMATED_JSON_OUTPUT_OVERHEAD_BYTES = 1024;

// Base64 expands 3 raw bytes into 4 encoded characters, plus JSON envelope overhead.
export const getEstimatedBase64OutputBytes = (rawBytes: number): number =>
  Math.ceil(rawBytes / 3) * 4 + ESTIMATED_JSON_OUTPUT_OVERHEAD_BYTES;

/** Case-insensitive header lookup. Returns the raw value (may be string or string[]). */
export const getHeaderValue = ({
  headers,
  headerName,
}: {
  headers: unknown;
  headerName: string;
}): unknown => {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }

  const normalizedHeaderName = headerName.toLowerCase();
  const headersRecord = headers as Record<string, unknown>;
  const matchingHeaderName = Object.keys(headersRecord).find(
    (key) => key.toLowerCase() === normalizedHeaderName
  );

  return matchingHeaderName ? headersRecord[matchingHeaderName] : undefined;
};

/** Extracts content-length from an Axios-like error's response or request headers. */
export const getResponseContentLengthBytes = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const axiosError = error as {
    response?: { headers?: unknown };
    request?: { res?: { headers?: unknown } };
  };
  const headerValue =
    getHeaderValue({ headers: axiosError.response?.headers, headerName: 'content-length' }) ??
    getHeaderValue({ headers: axiosError.request?.res?.headers, headerName: 'content-length' });

  return getFinitePositiveNumber(Array.isArray(headerValue) ? headerValue[0] : headerValue);
};

export const setConnectorActionErrorMeta = (
  error: unknown,
  meta: ConnectorActionErrorMeta
): void => {
  if (!error || typeof error !== 'object') {
    return;
  }

  const contentLengthBytes = getFinitePositiveNumber(meta.contentLengthBytes);
  const estimatedOutputBytes = getFinitePositiveNumber(meta.estimatedOutputBytes);
  const sanitizedMeta = {
    ...(contentLengthBytes !== undefined ? { contentLengthBytes } : {}),
    ...(estimatedOutputBytes !== undefined ? { estimatedOutputBytes } : {}),
  };

  connectorActionErrorMeta.set(error, {
    ...connectorActionErrorMeta.get(error),
    ...sanitizedMeta,
  });
};

export const getConnectorActionErrorMeta = (
  error: unknown
): ConnectorActionErrorMeta | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  return connectorActionErrorMeta.get(error);
};

export interface ActionDefinition<TInput = unknown, TOutput = unknown, TError = unknown> {
  isTool?: boolean;
  input: z.ZodSchema<TInput>;
  output?: z.ZodSchema<TOutput>;
  error?: z.ZodSchema<TError>;
  handler: (ctx: ActionContext, input: TInput) => Promise<TOutput>;
  description?: string;
  actionGroup?: string;
  supportsStreaming?: boolean;
  /**
   * HTTP response header that advertises response size for this action.
   * The generated executor reads this header from Axios errors when the Actions
   * response-size limit is exceeded. Defaults to `content-length`.
   */
  responseSizeHeader?: string;
}

export interface ActionContext {
  client: AxiosInstance;
  config?: Record<string, unknown>;
  connectorUsageCollector?: unknown;
  log: Logger;
  secrets?: Record<string, unknown>;
}

// ============================================================================
// TRANSFORMATIONS
// ============================================================================

export interface TemplateRendering {
  enabled: boolean;
  format?: 'mustache' | 'handlebars' | 'custom';
  escaping?: 'html' | 'json' | 'markdown' | 'none';
}

export interface Transformations {
  templates?: TemplateRendering;
  serializeRequest?: (data: unknown) => unknown;
  deserializeResponse?: (data: unknown) => unknown;
  interceptors?: {
    request?: (config: unknown) => unknown | Promise<unknown>;
    response?: (response: unknown) => unknown | Promise<unknown>;
  };
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

export interface AuthTypeDef {
  type: string;
  defaults: Record<string, unknown>;
  overrides?: {
    meta?: Record<string, Record<string, unknown>>;
    // can override other Zod fields here in the future if needed
  };
}
export interface ConnectorSpec {
  metadata: ConnectorMetadata;

  auth?: {
    types: Array<string | AuthTypeDef>;
    headers?: Record<string, AxiosHeaderValue>;
  };

  // Single unified schema for all connector fields (config + secrets)
  // Mark sensitive fields with withUIMeta({ sensitive: true })
  schema?: z.ZodObject;

  validateUrls?: {
    fields?: string[];
  };

  policies?: ConnectorPolicies;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- record of actions with different input types (contravariance)
  actions: Record<string, ActionDefinition<any, any, any>>;

  test?: ConnectorTest;

  transformations?: Transformations;

  // Optional skill content for Agent Builder. When present, this string is
  // included in the connector's agent attachment representation so the LLM
  // has richer context about how to use the connector's sub-actions.
  skill?: string;
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

export function requiresCredentials(auth: { method: string }): boolean {
  return auth.method !== 'none' && auth.method !== 'webhook';
}

export function supportsStreaming(connector: ConnectorSpec): boolean {
  return connector.policies?.streaming?.enabled ?? false;
}

export function getActionNames(connector: ConnectorSpec): string[] {
  return Object.keys(connector.actions);
}

export function isToolAction(connector: ConnectorSpec, actionName: string): boolean {
  return connector.actions[actionName]?.isTool ?? false;
}
