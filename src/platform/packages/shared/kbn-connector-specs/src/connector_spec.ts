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
  /**
   * Documentation URL for this connector type. Set it when the id-based derivation
   * wouldn't resolve to the published page (e.g. a differing slug or a third-party site).
   * Use an empty string when the connector has no dedicated page: it resolves to the
   * connectors index via the doc-links service. When omitted, the URL is derived from
   * the connector id.
   */
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
// oauth authz code and client credentials with client secret
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

export interface OAuthClientCredsPrivateKeyJWTGetTokenOpts {
  authType: 'oauth_client_credentials_private_key_jwt';
  tokenUrl: string;
  scope?: string;
  clientId: string;
}

export interface EarsGetTokenOpts {
  authType: 'ears';
  provider: string;
  scope?: string;
}

export type GetTokenOpts =
  | OAuthGetTokenOpts
  | OAuthClientCredsPrivateKeyJWTGetTokenOpts
  | EarsGetTokenOpts;

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

// ============================================================================
// AGENT SANDBOX EXPOSURE
// ============================================================================
// Lets a connector declare, per action, whether/how it may be invoked from an
// agent sandbox (untrusted code running a coding sub-agent). The guiding rule is
// "capability, not credential": the sandbox never receives the connector's
// secret; it calls back to Kibana (the broker) which runs the action host-side.
// All fields are opt-in and fail-safe — absent = not exposed, unclassified
// actions are treated as mutating ('write').

/**
 * Access class for a sandbox-exposed action, used to enforce a sandbox's
 * `connectorAccess` policy: a read-only sandbox may only call 'read' actions.
 */
export type SandboxAccessClass = 'read' | 'write';

/**
 * How a connector's credential is handled when a sandbox uses it:
 * - `broker-rpc`         — the secret never leaves Kibana; the sandbox calls
 *   `execute_connector` over the MCP loopback and the action runs host-side.
 *   The default and correct choice for almost every connector.
 * - `short-lived-token`  — for the rare integrations that natively support
 *   scoped, expiring tokens (e.g. GitHub App installation tokens, cloud STS):
 *   a scoped token is minted host-side and injected into the sandbox for the
 *   duration of the operation. Requires `mintScopedToken`.
 * - `host-proxy`         — Kibana performs the privileged operation and streams
 *   the result into the sandbox (e.g. clone a private repo host-side, hydrate
 *   the workspace). No credential crosses the boundary.
 */
export type SandboxCredentialStrategy = 'broker-rpc' | 'short-lived-token' | 'host-proxy';

/** Per-action declaration of how it is exposed to agent sandboxes. */
export interface SandboxActionExposure {
  /** When true, this action may be invoked from an agent sandbox via the broker. */
  exposed: boolean;
  /**
   * Access class used to enforce the sandbox's `connectorAccess` policy.
   * Defaults to 'write' when omitted (fail-safe: unclassified actions are
   * treated as mutating so a read-only sandbox can't call them).
   */
  access?: SandboxAccessClass;
  /** Optional per-run cap on how many times a sandbox may call this action. */
  maxCallsPerRun?: number;
}

/** Connector-level default posture + credential strategy for sandbox use. */
export interface ConnectorSandboxSpec {
  /** Master switch: may any of this connector's actions be used from a sandbox. */
  exposable: boolean;
  /**
   * How credentials are handled when a sandbox uses this connector.
   * Defaults to 'broker-rpc' (secret stays host-side) when omitted.
   */
  credentialStrategy?: SandboxCredentialStrategy;
  /** Default access class for exposed actions that don't set their own. */
  defaultAccess?: SandboxAccessClass;
}

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
  /**
   * How this action is exposed to agent sandboxes. Omit (or `exposed: false`)
   * to keep the action unreachable from untrusted sandbox code.
   */
  sandbox?: SandboxActionExposure;
}

export interface ActionContext {
  client: AxiosInstance;
  config?: Record<string, unknown>;
  connectorUsageCollector?: unknown;
  log: Logger;
  secrets?: Record<string, unknown>;
}

// ============================================================================
// SANDBOX CLI CREDENTIALS
// ============================================================================

export const SANDBOX_CLI_MINT_TOKEN_ACTION = '_sandbox_cli_mint_token';
export const SANDBOX_CLI_MINT_TOKEN_OPTIONS_ACTION = '_sandbox_cli_mint_token_options';
export const SANDBOX_CLI_REVOKE_TOKEN_ACTION = '_sandbox_cli_revoke_token';

export interface SandboxCliFile {
  path: string;
  contents: string;
  mode?: string;
}

export interface SandboxCliToken {
  source: string;
  expiresAt?: number;
  env?: Record<string, string>;
  files?: SandboxCliFile[];
  setupCommands?: string[];
  cleanupPaths?: string[];
}

export interface SandboxCliCapability<
  TMintInput = unknown,
  TToken extends SandboxCliToken = SandboxCliToken,
  TOptions = unknown
> {
  /**
   * Short prompt guidance explaining when the parent agent should request this
   * connector's CLI credentials and what follow-up questions to ask.
   */
  skill: string;
  mintToken: {
    schema: z.ZodSchema<TMintInput>;
    handler: (ctx: ActionContext, input: TMintInput) => Promise<TToken>;
  };
  mintTokenOptions?: {
    handler: (ctx: ActionContext) => Promise<TOptions>;
  };
  revokeToken: {
    handler: (ctx: ActionContext, token: TToken) => Promise<void>;
  };
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

export const TEST_CONNECTOR_SUB_ACTION = '_test';

/**
 * Success = return data; failure = throw (mapped to error by the executor).
 *
 * Transitional union: new handlers return arbitrary data (`Record<string, unknown>`,
 * use `{}` when there's nothing to report), while not-yet-migrated handlers may still
 * return the legacy `{ ok, message }` shape. Once every handler follows the
 * throw-on-failure contract this can be narrowed to `Record<string, unknown>`.
 */
export type ConnectorTestHandlerResult =
  | Record<string, unknown>
  | { ok: boolean; message?: string };

export interface ConnectorTest {
  /**
   * Test-tab handler. Return data (use `{}` when there's nothing to report); throw on failure.
   * A resolved value is treated as success by the executor.
   */
  handler: (ctx: ActionContext) => Promise<ConnectorTestHandlerResult>;
  description?: string;
  /** Flag to opt-in for testing */
  enabled?: boolean;
}

// ============================================================================
// MAIN CONNECTOR DEFINITION
// ============================================================================

export interface AuthTypeDef {
  type: string;
  /** When true, renders a "Recommended" badge in the picker to highlight the preferred auth option. */
  isRecommended?: boolean;
  /** When true, excluded from the UI picker but kept in the validation schema for backwards compatibility with existing connectors. */
  isLegacy?: boolean;
  isExperimental?: boolean;
  defaults: Record<string, unknown>;
  overrides?: {
    /** Display name shown in the auth type picker. Defaults to the auth type's built-in label when omitted. */
    label?: string;
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

  // Optional agent-sandbox exposure. When present and `exposable`, the connector
  // opts in to being called from an agent sandbox (via the broker). Per-action
  // exposure/access is declared on each `ActionDefinition.sandbox`. Absent =
  // the connector is not reachable from sandboxes (fail-safe default).
  sandbox?: ConnectorSandboxSpec;

  /**
   * Optional connector-owned CLI credential contract. Agent Builder uses this
   * to describe, mint, and revoke short-lived credentials for sandbox CLIs.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- connector specs provide different CLI token schemas
  sandboxCli?: SandboxCliCapability<any, any, any>;
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

/** The credential strategy for a connector, defaulting to the safe broker RPC. */
export function getSandboxCredentialStrategy(connector: ConnectorSpec): SandboxCredentialStrategy {
  return connector.sandbox?.credentialStrategy ?? 'broker-rpc';
}

/**
 * The effective access class of an action for sandbox use: the action's own
 * `access`, else the connector's `defaultAccess`, else 'write' (fail-safe:
 * unclassified actions are treated as mutating).
 */
export function getSandboxActionAccess(
  connector: ConnectorSpec,
  actionName: string
): SandboxAccessClass {
  const action = connector.actions[actionName];
  return action?.sandbox?.access ?? connector.sandbox?.defaultAccess ?? 'write';
}

/**
 * Whether an action may be invoked from a sandbox at the given access level.
 * Requires the connector to be `exposable`, the action to be `exposed`, and —
 * when `access` is provided — the action's class to be permitted (a 'read'
 * sandbox may only call 'read' actions; a 'write' sandbox may call either).
 */
export function isSandboxExposed(
  connector: ConnectorSpec,
  actionName: string,
  access?: SandboxAccessClass
): boolean {
  if (!connector.sandbox?.exposable) return false;
  if (!connector.actions[actionName]?.sandbox?.exposed) return false;
  if (access === 'read') return getSandboxActionAccess(connector, actionName) === 'read';
  return true;
}

/**
 * Names of actions a sandbox may invoke at the given access level. Used by the
 * broker to build the allowed tool surface and by the agent-attachment layer to
 * tell the LLM what it can do from inside the sandbox.
 */
export function getSandboxExposedActions(
  connector: ConnectorSpec,
  access?: SandboxAccessClass
): string[] {
  return Object.keys(connector.actions).filter((name) => isSandboxExposed(connector, name, access));
}
