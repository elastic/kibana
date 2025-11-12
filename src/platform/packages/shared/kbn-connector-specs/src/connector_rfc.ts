/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Stack Connectors 2.0 - Universal TypeScript Specification
 *
 * This file defines the universal interface that all Stack Connectors will implement.
 * It supports all features found across 30 existing Kibana connectors including:
 * - 8 authentication patterns
 * - Rate limiting and pagination strategies
 * - Streaming for AI connectors
 * - Multiple sub-actions per connector
 * - Special capabilities (OAuth token management, RTR sessions, etc.)
 *
 * KEY DESIGN PRINCIPLE:
 * The UI should be fully derivable from Zod schemas with minimal additional metadata.
 * This enables:
 * - Single source of truth (schema = validation + UI)
 * - LLM-friendly spec (just define schemas, UI is generated)
 * - Reduced boilerplate (no separate UI definitions)
 *
 * @see connector_spec.md for comprehensive feature mapping and examples
 * @see connector_spec_ui.ts for UI metadata extension system
 * @see connector_spec_examples.ts for example implementations
 */

import { z } from '@kbn/zod';
import type { AxiosInstance } from 'axios';
import type { Logger } from '@kbn/logging';
import { withUIMeta } from './connector_spec_ui';

// ============================================================================
// INTERNATIONALIZATION (i18n)
// ============================================================================

/**
 * Internationalization Support
 *
 * WHY: Connectors are used globally and need to display UI text in multiple languages.
 * Kibana uses @kbn/i18n for translations.
 *
 * APPROACH: Option 1 (Explicit) - Use i18n.translate() for user-facing strings
 * - Simple to implement
 * - Follows existing Kibana patterns
 * - Spec authors manually mark translatable strings
 * - Translation keys get extracted during build
 *
 * FUTURE: May move to auto-extraction (Option 2) when transitioning to YAML specs
 *
 * @see https://github.com/elastic/kibana/blob/main/packages/kbn-i18n/README.md
 */

/**
 * Fields that should be translated:
 * 1. Connector metadata (displayName, description)
 * 2. Field labels (in uiMeta)
 * 3. Field help text (in uiMeta)
 * 4. Section titles (in ConnectorLayout)
 * 5. Action descriptions
 * 6. Validation error messages
 * 7. Test result messages
 *
 * CONVENTION: Use connector ID as namespace prefix
 * Format: `xpack.stackConnectors.{connectorId}.{context}.{key}`
 *
 * Examples:
 * - `xpack.stackConnectors.slack.metadata.displayName`
 * - `xpack.stackConnectors.slack.config.url.label`
 * - `xpack.stackConnectors.slack.actions.postMessage.description`
 */

/**
 * Helper to create namespaced translation keys
 *
 * @example
 * ```typescript
 * const i18nKeys = createI18nKeys('.slack');
 *
 * displayName: i18n.translate(i18nKeys.metadata('displayName'), {
 *   defaultMessage: 'Slack'
 * })
 * ```
 */
export function createI18nKeys(connectorId: string) {
  const base = `xpack.stackConnectors${connectorId}`;
  return {
    metadata: (key: string) => `${base}.metadata.${key}`,
    config: (key: string) => `${base}.config.${key}`,
    secrets: (key: string) => `${base}.secrets.${key}`,
    actions: (actionName: string, key: string) => `${base}.actions.${actionName}.${key}`,
    validation: (key: string) => `${base}.validation.${key}`,
    test: (key: string) => `${base}.test.${key}`,
    layout: (key: string) => `${base}.layout.${key}`,
  };
}

/**
 * Example: Translating connector metadata
 *
 * @example
 * ```typescript
 * const i18nKeys = createI18nKeys('.slack');
 *
 * metadata: {
 *   id: '.slack_api',
 *   displayName: i18n.translate(i18nKeys.metadata('displayName'), {
 *     defaultMessage: 'Slack'
 *   }),
 *   description: i18n.translate(i18nKeys.metadata('description'), {
 *     defaultMessage: 'Send messages to Slack channels'
 *   }),
 *   // ...
 * }
 * ```
 *
 * @example Translating field labels (in Zod schema)
 * ```typescript
 * configSchema: z.object({
 *   url: withUIMeta(z.string().url(), {
 *     label: i18n.translate(i18nKeys.config('url.label'), {
 *       defaultMessage: 'Webhook URL'
 *     }),
 *     helpText: i18n.translate(i18nKeys.config('url.helpText'), {
 *       defaultMessage: 'The webhook URL from Slack'
 *     })
 *   })
 * })
 * ```
 *
 * @example Translating validation errors
 * ```typescript
 * configSchema: z.object({
 *   url: z.string().url().refine(
 *     (url) => isAllowed(url),
 *     {
 *       message: i18n.translate(i18nKeys.validation('urlNotAllowed'), {
 *         defaultMessage: 'URL is not in the allowlist'
 *       })
 *     }
 *   )
 * })
 * ```
 *
 * @example Translating action descriptions
 * ```typescript
 * actions: {
 *   postMessage: {
 *     description: i18n.translate(i18nKeys.actions('postMessage', 'description'), {
 *       defaultMessage: 'Post a message to a Slack channel'
 *     }),
 *     // ...
 *   }
 * }
 * ```
 */

// ============================================================================
// METADATA & IDENTIFICATION
// ============================================================================

/**
 * Connector metadata that defines its identity and capabilities
 */
export interface ConnectorMetadata {
  /** Unique connector ID (e.g., ".slack_api", ".jira") */
  id: string;

  /** Display name shown in UI */
  displayName: string;

  /** Icon identifier for UI rendering */
  icon?: string;

  /** Short description of the connector's purpose */
  description: string;

  /** URL to connector documentation */
  docsUrl?: string;

  /** Minimum Kibana license required */
  minimumLicense: 'basic' | 'gold' | 'platinum' | 'enterprise';

  /** Feature IDs this connector supports */
  supportedFeatureIds: Array<
    | 'alerting'
    | 'cases'
    | 'uptime'
    | 'security'
    | 'siem'
    | 'generativeAIForSecurity'
    | 'generativeAIForObservability'
    | 'generativeAIForSearchPlayground'
    | 'endpointSecurity'
  >;
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Authentication schema covering all 8 auth patterns found in connectors
 *
 * Each method includes real-world connector examples with exact file paths and line numbers
 */
export const AuthSchema = z.discriminatedUnion('method', [
  // 1. No Authentication
  // USED BY: Server Log, ES Index (internal connectors that don't call external APIs)
  // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/server_log/index.ts
  z.object({
    method: z.literal('none'),
  }),

  // 2. Basic Authentication (username/password)
  // USED BY: Jira, ServiceNow (ITSM, SIR, ITOM), Resilient, XSOAR, TheHive
  // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/jira/service.ts:66
  //   Code: `headers: getBasicAuthHeader({ username: email, password: apiToken })`
  // WHY: Enterprise ticketing systems commonly use HTTP Basic Auth
  z.object({
    method: z.literal('basic'),
    credentials: z.object({
      username: z.string(),
      password: z.string(),
    }),
  }),

  // 3. Bearer Token / API Key
  // USED BY: OpenAI, Gemini, PagerDuty, Opsgenie, Torq, D3Security, Inference
  // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/openai/lib/utils.ts:94
  //   Code: `Authorization: \`Bearer \${apiKey}\``
  // WHY: Most modern APIs use Bearer tokens or API keys for simplicity
  z.object({
    method: z.literal('bearer'),
    token: z.string().describe('Bearer token or API key'),
  }),

  // 4. Custom Headers
  // USED BY: Slack API, xMatters, Cases Webhook, Tines
  // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/slack_api/service.ts:131-134
  //   Code: `headers: { Authorization: \`Bearer \${token}\`, 'Content-type': 'application/json; charset=UTF-8' }`
  // WHY: Services requiring custom header names (e.g., "Authorization: Bearer ...", "X-API-Key: ...")
  z.object({
    method: z.literal('headers'),
    headers: z.record(z.string(), z.string()),
  }),

  // 5. OAuth2 Client Credentials
  // USED BY: Crowdstrike, SentinelOne, Microsoft Defender Endpoint (Teams uses webhook, not OAuth2)
  // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/crowdstrike/token_manager.ts:76
  //   Code: `authorization: 'Basic ' + this.base64encodedToken` (client_credentials flow)
  //   Code: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/crowdstrike/crowdstrike.ts:250
  //   Code: `Authorization: \`Bearer \${token}\`` (using fetched OAuth token)
  // WHY: Enterprise services requiring OAuth2 machine-to-machine auth
  z.object({
    method: z.literal('oauth2'),
    config: z.object({
      tokenUrl: z.string().url(),
      clientId: z.string(),
      clientSecret: z.string(),
      scope: z.string().optional(),
      additionalFields: z.string().optional(),
    }),
  }),

  // 6. mTLS/PKI Certificate-based
  // USED BY: Webhook (with SSL), Cases Webhook (with SSL), Email (optional)
  // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/webhook/get_axios_config.ts:100-106
  //   Code: `buildConnectorAuth({ hasAuth, authType, secrets, verificationMode, ca })`
  // WHY: High-security environments requiring mutual TLS authentication
  z.object({
    method: z.literal('ssl'),
    certificate: z.discriminatedUnion('type', [
      z.object({
        type: z.literal('crt'),
        cert: z.string().describe('Base64-encoded certificate'),
        key: z.string().describe('Base64-encoded private key'),
        passphrase: z.string().optional(),
        ca: z.string().optional().describe('Base64-encoded CA certificate'),
        verificationMode: z.enum(['none', 'certificate', 'full']).optional(),
      }),
      z.object({
        type: z.literal('pfx'),
        pfx: z.string().describe('Base64-encoded PFX bundle'),
        passphrase: z.string().optional(),
        ca: z.string().optional().describe('Base64-encoded CA certificate'),
        verificationMode: z.enum(['none', 'certificate', 'full']).optional(),
      }),
    ]),
  }),

  // 7. AWS Signature v4
  // USED BY: Bedrock (AWS AI service)
  // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/bedrock/bedrock.ts:186-211
  //   Code: `aws.sign({ host, headers, body, path, service: 'bedrock' }, { secretAccessKey, accessKeyId })`
  // WHY: AWS services require SigV4 signing for authentication
  z.object({
    method: z.literal('aws_sig_v4'),
    credentials: z.object({
      accessKey: z.string(),
      secretKey: z.string(),
      region: z.string().optional(),
      service: z.string().optional(),
    }),
  }),

  // 8. Webhook URL (auth embedded in URL)
  // USED BY: Slack Webhook, PagerDuty (webhook mode), Teams, Webhook connector
  // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/teams/index.ts:140
  //   Code: `url: webhookUrl` (secret webhook URL from configuration)
  // WHY: Simple webhook integrations where the secret is in the URL itself
  z.object({
    method: z.literal('webhook'),
    url: z.string().url(),
    extraHeaders: z.record(z.string(), z.string()).optional(),
  }),
]);

export type AuthConfig = z.infer<typeof AuthSchema>;

// ============================================================================
// POLICIES & STRATEGIES
// ============================================================================

/**
 * Common retry status code patterns
 *
 * WHY: Provide reusable constants for common retry scenarios instead of
 * repeating status code arrays across connectors.
 *
 * @example Using a constant
 * ```typescript
 * retry: {
 *   retryOnStatusCodes: RETRY_RATE_LIMIT,
 *   maxRetries: 3
 * }
 * ```
 *
 * @example Combining constants
 * ```typescript
 * retry: {
 *   retryOnStatusCodes: [...RETRY_RATE_LIMIT, ...RETRY_GATEWAY_ERRORS]
 * }
 * ```
 */

/** Retry on rate limit errors (429, and 503 which some APIs use for rate limiting) */
export const RETRY_RATE_LIMIT = [429, 503] as const;

/** Retry on common server errors (all 5xx errors) */
export const RETRY_SERVER_ERRORS = [500, 502, 503, 504] as const;

/** Retry on gateway/proxy errors only (not 500) */
export const RETRY_GATEWAY_ERRORS = [502, 503, 504] as const;

/** Retry on timeout and rate limit errors */
export const RETRY_TIMEOUT_AND_RATE_LIMIT = [408, 429, 503] as const;

/**
 * Rate limiting policy configuration
 *
 * WHY: External APIs often have rate limits to prevent abuse. Connectors need
 * to detect and handle rate limiting gracefully, with automatic retries after
 * the rate limit resets.
 */
export interface RateLimitPolicy {
  /**
   * Strategy for detecting rate limits
   *
   * - header: Read rate limit info from response headers
   *   USED BY: Slack API, Teams
   *   REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/slack_api/service.ts:63
   *     Code: `// special handling for rate limiting`
   *   REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/teams/index.ts:158-159
   *     Code: Comment about 429 rate limiting with response body
   *
   * - status_code: Detect 429 status codes
   *   USED BY: Most connectors as fallback (PagerDuty, Opsgenie, Jira, Webhook, Torq)
   *   REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/webhook/index.ts:178
   *     Code: `// special handling for rate limiting`
   *   REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/torq/index.ts:218
   *     Code: `// special handling for rate limiting`
   *
   * - response_body: Parse rate limit info from response JSON
   *   USED BY: Teams (embeds rate limit info in response body)
   *   REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/teams/index.ts:158-159
   *     Code: `// with a 429 message in the response body when the rate limit is hit`
   */
  strategy: 'header' | 'status_code' | 'response_body';

  /**
   * HTTP status codes that indicate rate limiting
   * COMMON: [429, 503] - 429 = Too Many Requests, 503 = Service Unavailable
   * USED BY: Slack, Jira, ServiceNow, OpenAI, Teams
   * REFERENCE: Most connectors handle 429 as a special case for user-facing errors
   */
  codes?: number[];

  /**
   * Header containing retry-after information
   * EXAMPLE: "x-ratelimit-remaining" (Slack), "x-rate-limit-remaining" (GitHub)
   * REFERENCE: Slack API uses this to determine when rate limits will reset
   */
  remainingHeader?: string;

  /**
   * Header containing rate limit reset time
   * EXAMPLE: "x-ratelimit-reset" (Slack), "x-rate-limit-reset" (GitHub)
   * REFERENCE: Used to calculate wait time before retrying
   */
  resetHeader?: string;

  /**
   * JSON path to rate limit info in response body
   * EXAMPLE: "error.retry_after" for APIs that embed retry info in error responses
   * REFERENCE: Teams connector parses rate limit info from response body
   */
  bodyPath?: string;
}

/**
 * Pagination policy configuration
 */
export interface PaginationPolicy {
  /**
   * Pagination strategy
   *
   * cursor: Cursor/token-based pagination (most modern APIs)
   *   USED BY: Slack (response_metadata.next_cursor), Crowdstrike, SentinelOne
   *   REFERENCE: Slack uses cursor pagination in API responses
   *   Example: { "response_metadata": { "next_cursor": "dGVhbTpDMDYxRkE1UEI=" } }
   *
   * offset: Offset/limit-based pagination (traditional REST)
   *   USED BY: Jira, ServiceNow, Resilient
   *   REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/jira/service.ts:436-438
   *   Code: `jql=project="${projectKey}" and summary ~"${title}"` with startAt parameter
   *
   * link_header: RFC 5988 Link header pagination
   *   USED BY: GitHub API, some enterprise REST APIs
   *   Example: Link: <https://api.example.com/data?page=2>; rel="next"
   *
   * none: No pagination support
   *   USED BY: Most single-action connectors (Webhook, Email, Teams, PagerDuty)
   */
  strategy: 'cursor' | 'offset' | 'link_header' | 'none';

  /**
   * Where pagination parameters are provided
   *
   * WHY: Different APIs expect pagination parameters in different locations.
   * This affects how the framework constructs paginated requests.
   *
   * COMMON PATTERNS:
   * - query_params: Most REST APIs (GET requests)
   *   USED BY: Slack, Jira, ServiceNow, GitHub
   *   Example: `GET /api/users?offset=20&limit=10`
   *
   * - headers: Some APIs use custom headers for pagination
   *   USED BY: Some enterprise APIs with custom pagination schemes
   *   Example: `X-Page: 2`, `X-Per-Page: 50`
   *
   * - body: POST-based pagination (search/query APIs)
   *   USED BY: Elasticsearch, some GraphQL APIs, search endpoints
   *   Example: `POST /api/search { "query": "...", "offset": 20, "limit": 10 }`
   *
   * @example Query parameters (most common)
   * ```typescript
   * pagination: {
   *   strategy: 'offset',
   *   parameterLocation: 'query_params',
   *   offsetParam: 'offset',
   *   limitParam: 'limit'
   * }
   * ```
   *
   * @example Request body (POST-based search)
   * ```typescript
   * pagination: {
   *   strategy: 'cursor',
   *   parameterLocation: 'body',
   *   cursorParam: 'next_token'
   * }
   * ```
   *
   * @example Headers (custom pagination)
   * ```typescript
   * pagination: {
   *   strategy: 'offset',
   *   parameterLocation: 'headers',
   *   offsetParam: 'X-Page',
   *   limitParam: 'X-Per-Page'
   * }
   * ```
   *
   * DEFAULT: 'query_params' if not specified
   */
  parameterLocation?: 'query_params' | 'headers' | 'body';

  /**
   * JSON path to the actual data/results in the response
   *
   * WHY: Paginated responses typically wrap the actual data with metadata
   * (pagination info, counts, etc.). This field specifies where to find the
   * actual data to extract and aggregate across pages.
   *
   * USED BY: All connectors with pagination that need to aggregate results
   *
   * COMMON PATTERNS:
   * - `data`: Simple wrapper - `{ "data": [...], "next": "..." }`
   * - `items`: Common in REST APIs - `{ "items": [...], "nextToken": "..." }`
   * - `results`: Search APIs - `{ "results": [...], "page": 2 }`
   * - `data.items`: Nested - `{ "data": { "items": [...] }, "meta": {...} }`
   *
   * @example Simple data wrapper
   * ```typescript
   * // Response: { "data": [{"id": 1}, {"id": 2}], "nextPage": 2 }
   * pagination: {
   *   strategy: 'offset',
   *   resultPath: 'data',  // Extract the array at "data"
   *   offsetParam: 'page'
   * }
   * ```
   *
   * @example Nested path
   * ```typescript
   * // Response: { "response": { "items": [...] }, "pagination": { "next": "..." } }
   * pagination: {
   *   strategy: 'cursor',
   *   resultPath: 'response.items',  // Extract nested array
   *   cursorPath: 'pagination.next'
   * }
   * ```
   *
   * @example Top-level array (no wrapper)
   * ```typescript
   * // Response: [{"id": 1}, {"id": 2}]
   * pagination: {
   *   strategy: 'link_header',
   *   resultPath: undefined  // No wrapper, response is the array itself
   * }
   * ```
   *
   * @example GitHub API
   * ```typescript
   * // Response: { "items": [...], "total_count": 100, "incomplete_results": false }
   * pagination: {
   *   strategy: 'link_header',
   *   resultPath: 'items',
   *   linkHeaderName: 'Link'
   * }
   * ```
   *
   * If not specified, the entire response is treated as the result array.
   */
  resultPath?: string;

  /**
   * For cursor-based pagination
   * cursorParam: Query parameter name for cursor (e.g., "cursor", "next_token")
   * cursorPath: JSON path to next cursor in response (e.g., "response_metadata.next_cursor")
   * EXAMPLE: Slack API uses cursor="xxx" parameter and returns next_cursor in response
   */
  cursorParam?: string;
  cursorPath?: string;

  /**
   * For offset-based pagination
   * offsetParam: Parameter for page offset (e.g., "offset", "skip", "startAt")
   * limitParam: Parameter for page size (e.g., "limit", "maxResults", "top")
   * EXAMPLE: Jira uses startAt=0&maxResults=50
   */
  offsetParam?: string;
  limitParam?: string;

  /**
   * For link header pagination
   * linkHeaderName: Header name (usually "Link")
   * EXAMPLE: Link: <https://api.example.com/data?page=2>; rel="next"
   */
  linkHeaderName?: string;

  /**
   * Page size parameter name
   * EXAMPLE: "limit" (Slack), "maxResults" (Jira), "top" (Teams)
   */
  pageSizeParam?: string;

  /**
   * Default/max page size
   * COMMON: 50-100 for most APIs
   * EXAMPLE: Slack defaults to 100, Jira defaults to 50
   */
  defaultPageSize?: number;
}

/**
 * Retry policy configuration
 *
 * WHY: Network failures and transient errors are common. Automatic retries with
 * exponential backoff improve reliability without user intervention.
 */
export interface RetryPolicy {
  /**
   * HTTP status codes to retry on
   *
   * WHY: Different APIs use different status codes for retryable errors.
   * Explicit list provides clear, unambiguous retry behavior.
   *
   * COMMON PATTERNS:
   * - Rate limiting: `[429]` or `[429, 503]` (some APIs use 503 for rate limits)
   * - Server errors: `[500, 502, 503, 504]` (common 5xx errors)
   * - Gateway errors: `[502, 503, 504]` (exclude 500 if not retryable)
   * - Timeout + Rate limit: `[408, 429, 503]`
   *
   * USED BY: All connectors with retry logic
   * REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/slack/index.test.ts:399
   *   Code: Slack retries on 429 rate limit errors
   * REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/openai/openai.test.ts:626
   *   Code: OpenAI retries on 429 rate limit errors
   *
   * @example Rate limiting only
   * ```typescript
   * retry: {
   *   retryOnStatusCodes: [429],
   *   maxRetries: 3,
   *   backoffStrategy: 'exponential'
   * }
   * ```
   *
   * @example Rate limiting + service unavailable (503 used by some APIs for rate limits)
   * ```typescript
   * retry: {
   *   retryOnStatusCodes: [429, 503],
   *   maxRetries: 5,
   *   backoffStrategy: 'exponential'
   * }
   * ```
   *
   * @example Common server/gateway errors
   * ```typescript
   * retry: {
   *   retryOnStatusCodes: [500, 502, 503, 504],
   *   maxRetries: 3
   * }
   * ```
   *
   * @example Gateway errors only (not 500)
   * ```typescript
   * retry: {
   *   retryOnStatusCodes: [502, 503, 504],
   *   maxRetries: 5
   * }
   * ```
   *
   * TIP: Use exported constants for common patterns:
   * ```typescript
   * import { RETRY_SERVER_ERRORS, RETRY_RATE_LIMIT } from './connector_spec';
   *
   * retry: {
   *   retryOnStatusCodes: RETRY_SERVER_ERRORS  // [500, 502, 503, 504]
   * }
   * ```
   */
  retryOnStatusCodes?: number[];

  /**
   * Custom retry logic for specific error patterns
   *
   * USED BY: Connectors with custom error handling (Crowdstrike, OAuth2 connectors)
   * WHY: Some APIs have unique error codes or patterns that need special retry logic
   */
  customRetryCondition?: (error: {
    status?: number;
    message?: string;
    response?: unknown;
  }) => boolean;

  /**
   * Maximum retry attempts
   *
   * COMMON: 3-5 retries for most connectors
   * WHY: Balance between reliability and response time. Too many retries delay error reporting.
   */
  maxRetries?: number;

  /**
   * Backoff strategy
   *
   * - exponential: Recommended for most APIs (doubles delay each retry)
   *   USED BY: Most production connectors
   *   WHY: Prevents thundering herd, gives services time to recover
   *
   * - linear: Fixed increment each retry
   *   USED BY: Simple connectors with predictable behavior
   *
   * - fixed: Same delay between all retries
   *   USED BY: Local/internal services with consistent response times
   */
  backoffStrategy?: 'exponential' | 'linear' | 'fixed';

  /**
   * Initial backoff delay in ms
   *
   * COMMON: 1000ms (1 second) initial delay
   * WHY: Short enough to be responsive, long enough to let transient issues resolve
   */
  initialDelay?: number;
}

/**
 * Error classification for better handling
 *
 * WHY: Proper error classification helps users understand whether an error is
 * their fault (user error) or a system/service issue. This affects retry logic,
 * error messages, and alerting behavior.
 */
export interface ErrorPolicy {
  /**
   * Classify errors as user vs system errors
   *
   * USED BY: Webhook, Email, OpenAI, and most connectors
   * REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/email/index.ts:483
   *   Code: `// Mark 4xx and 5xx errors as user errors`
   * REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/webhook/index.test.ts:1118
   *   Code: `'forwards user error source in result for %s error responses'`
   * REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/slack/index.test.ts:399
   *   Code: `test('returns a user error for rate-limiting responses', async () => { ... })`
   *
   * WHY NEEDED:
   * - User errors (4xx): Bad credentials, invalid parameters, rate limits
   *   → Don't retry automatically, show actionable error messages
   * - System errors (5xx, network): Service down, timeouts
   *   → Retry automatically, alert operators
   *
   * CLASSIFICATION RULES (common pattern):
   * - 400-499: User errors (except 408 timeout, 429 rate limit may retry)
   * - 500-599: System errors (retryable)
   * - Network errors: System errors (retryable)
   * - Validation errors: User errors
   */
  classifyError?: (error: { status?: number; message?: string }) => 'user' | 'system' | 'unknown';

  /**
   * User error status codes (4xx typically)
   *
   * COMMON: [400, 401, 403, 404] - client errors
   * REFERENCE: Most connectors treat 4xx as user errors requiring user action
   * WHY: These indicate problems with the request (bad auth, invalid params, etc.)
   */
  userErrorCodes?: number[];

  /**
   * System error status codes (5xx typically)
   *
   * COMMON: [500, 502, 503, 504] - server errors
   * REFERENCE: Most connectors treat 5xx as retryable system errors
   * WHY: These indicate temporary server issues that may resolve on retry
   */
  systemErrorCodes?: number[];
}

/**
 * Streaming configuration for AI connectors
 */
export interface StreamingPolicy {
  /**
   * Whether connector supports streaming
   * USED BY: All AI connectors (OpenAI, Bedrock, Gemini, Inference)
   * WHY: LLMs generate responses token-by-token for better UX
   */
  enabled: boolean;

  /**
   * Streaming mechanism
   *
   * - sse: Server-Sent Events (most common for AI APIs)
   *   USED BY: OpenAI (stream=true), Inference connector
   *   REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/openai/lib/utils.ts:107-114
   *   Code: `pipeStreamingResponse(response: AxiosResponse<IncomingMessage>)` handles SSE streams
   *
   * - chunked: HTTP chunked transfer encoding
   *   USED BY: Bedrock streaming API with AWS EventStream
   *   REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/bedrock/bedrock.ts:191-196
   *   Code: `headers: { accept: 'application/vnd.amazon.eventstream' }` for chunked streaming
   *
   * - websocket: WebSocket connection for bidirectional streaming
   *   USED BY: (reserved for future real-time connectors)
   */
  mechanism?: 'sse' | 'chunked' | 'websocket';

  /**
   * Parser for streaming data
   *
   * - ndjson: Newline-delimited JSON (most common)
   *   USED BY: OpenAI (data: {...}\n\ndata: {...}\n\n)
   *
   * - json: Standard JSON chunks
   *   USED BY: Some enterprise APIs
   *
   * - text: Plain text streaming
   *   USED BY: Simple text-based APIs
   *
   * - custom: Custom parser implementation
   *   USED BY: Proprietary streaming formats
   */
  parser?: 'ndjson' | 'json' | 'text' | 'custom';
}

/**
 * Complete policies object
 */
export interface ConnectorPolicies {
  rateLimit?: RateLimitPolicy;
  pagination?: PaginationPolicy;
  retry?: RetryPolicy;
  error?: ErrorPolicy;
  streaming?: StreamingPolicy;
}

// ============================================================================
// ACTIONS & SUB-ACTIONS
// ============================================================================

/**
 * Definition of a single action/sub-action
 */
export interface ActionDefinition<TInput = unknown, TOutput = unknown, TError = unknown> {
  /** Whether this action can be used as a tool in LLM contexts */
  isTool?: boolean;

  /** Zod schema for input validation */
  input: z.ZodSchema<TInput>;

  /** Optional output schema for response validation */
  output?: z.ZodSchema<TOutput>;

  /**
   * Optional error schema for error responses
   *
   * WHY: Many APIs have well-defined error response structures. This schema
   * documents and validates error responses from the external API, improving
   * type safety and enabling better OpenAPI/OAS generation.
   *
   * USED BY: Connectors with OpenAPI specs, structured error APIs
   * EXAMPLES:
   * - GitHub API: Structured errors with message, documentation_url, errors array
   * - Stripe API: Error object with type, code, param, message
   * - Jira API: errorMessages array with detailed validation errors
   *
   * REFERENCE: Many modern APIs follow RFC 7807 (Problem Details for HTTP APIs)
   *
   * @example Simple error schema
   * ```typescript
   * error: z.object({
   *   message: z.string(),
   *   code: z.string().optional()
   * })
   * ```
   *
   * @example Detailed error schema (RFC 7807)
   * ```typescript
   * error: z.object({
   *   type: z.string(),        // Error type URI
   *   title: z.string(),       // Human-readable summary
   *   status: z.number(),      // HTTP status code
   *   detail: z.string(),      // Detailed explanation
   *   instance: z.string().optional(), // URI reference to specific occurrence
   *   errors: z.array(z.object({
   *     field: z.string(),
   *     message: z.string()
   *   })).optional()           // Field-level validation errors
   * })
   * ```
   *
   * @example OpenAPI-derived error schema
   * ```typescript
   * error: z.discriminatedUnion('type', [
   *   z.object({ type: z.literal('validation_error'), fields: z.record(z.string()) }),
   *   z.object({ type: z.literal('not_found'), resource: z.string() }),
   *   z.object({ type: z.literal('rate_limit'), retry_after: z.number() })
   * ])
   * ```
   */
  error?: z.ZodSchema<TError>;

  /** Action handler function */
  handler: (ctx: ActionContext, input: TInput) => Promise<TOutput>;

  /** Optional description for documentation/UI */
  description?: string;

  /**
   * Optional action group/category for UI organization
   *
   * WHY: Connectors with many actions (10+) need categorization for better UX.
   * Instead of a flat list, group related actions together in the UI.
   *
   * INSPIRED BY: n8n's action grouping (e.g., Slack: "Messages", "Channels", "Users")
   *
   * USED BY: Connectors with multiple actions
   * EXAMPLES:
   * - Slack: "Send Messages", "Manage Channels", "User Management"
   * - Gmail: "Compose", "Inbox", "Labels", "Drafts"
   * - Jira: "Issues", "Projects", "Search", "Comments"
   * - Crowdstrike: "Host Actions", "RTR Commands", "Agent Info"
   *
   * HOW IT WORKS:
   * 1. Each action declares its group via this field
   * 2. UI automatically groups actions with same `actionGroup` value
   * 3. Groups appear in order of first action that declares them (or use `actionGroups` in layout for explicit ordering)
   * 4. Actions without a group appear in a default "Actions" section
   *
   * @example Slack connector actions
   * ```typescript
   * actions: {
   *   postMessage: {
   *     actionGroup: "Messages",
   *     description: "Post a message to a channel",
   *     // ...
   *   },
   *   getChannels: {
   *     actionGroup: "Channels",
   *     description: "List all channels",
   *     // ...
   *   },
   *   searchChannels: {
   *     actionGroup: "Channels",
   *     description: "Search for channels",
   *     // ...
   *   }
   * }
   * // UI renders:
   * // - Messages: postMessage
   * // - Channels: getChannels, searchChannels
   * ```
   *
   * @example With i18n
   * ```typescript
   * actionGroup: i18n.translate(i18nKeys.actions('postMessage', 'group'), {
   *   defaultMessage: 'Messages'
   * })
   * ```
   *
   * TIP: Use consistent group names across actions. The UI will automatically
   * group actions with the same `actionGroup` value together.
   */
  actionGroup?: string;

  /** Whether this action supports streaming responses */
  supportsStreaming?: boolean;
}

/**
 * Context passed to action handlers
 */
export interface ActionContext {
  /** Authenticated connector instance */
  auth: AuthConfig;

  /** Logger instance */
  log: Logger;

  /** HTTP client (pre-configured with auth) */
  client?: AxiosInstance;

  /** Configuration values */
  config?: Record<string, unknown>;

  /** Optional connector usage collector */
  connectorUsageCollector?: unknown;
}

// ============================================================================
// SPECIAL CAPABILITIES
// ============================================================================

/**
 * Multi-provider support (e.g., Email with SMTP, Exchange, AWS SES)
 *
 * USED BY: Email connector (supports multiple email services)
 * FILE: email/index.ts
 * WHY: Single connector that can work with different backend services
 */
export interface MultiProviderCapability {
  /**
   * Available service providers
   * EXAMPLE (Email):
   *   - { id: "smtp", name: "SMTP", requiredConfig: ["host", "port"] }
   *   - { id: "exchange_server", name: "Microsoft Exchange Server" }
   *   - { id: "ses", name: "AWS SES" }
   *   - { id: "other", name: "Other" }
   */
  providers: Array<{
    id: string;
    name: string;
    requiredConfig?: string[];
    requiredSecrets?: string[];
  }>;

  /** Selected provider from config */
  selectedProvider: string;
}

/**
 * Function calling support for AI connectors
 *
 * USED BY: OpenAI (tools/functions), Bedrock (tool use), Gemini (function declarations)
 * FILE: openai/index.ts, bedrock/index.ts, gemini/index.ts
 * WHY: LLMs can call external functions/tools during generation
 */
export interface FunctionCallingCapability {
  /** Whether native function calling is supported */
  supported: boolean;

  /**
   * Function calling format/protocol
   * - openai: OpenAI function calling format (used by OpenAI, Inference)
   * - anthropic: Claude function calling format (used by Bedrock with Claude)
   * - generic: Generic tool use format
   */
  format?: 'openai' | 'anthropic' | 'generic';

  /** Whether tool use is enabled */
  toolUseEnabled?: boolean;
}

/**
 * Token management for OAuth2 connectors
 *
 * USED BY: Teams, Crowdstrike, SentinelOne, Microsoft Defender Endpoint
 * FILE: teams/index.ts, crowdstrike/index.ts, sentinelone/index.ts
 * WHY: OAuth2 tokens expire and need refresh logic
 */
export interface TokenManagementCapability {
  /**
   * Token refresh logic
   * EXAMPLE: Teams connector refreshes Azure AD tokens before expiry
   */
  refreshToken?: (currentToken: string) => Promise<string>;

  /**
   * Token expiration check
   * EXAMPLE: Check JWT exp claim or expiry timestamp
   */
  isTokenExpired?: (token: string) => boolean;

  /**
   * Token storage key
   * EXAMPLE: "teams_oauth_token", "crowdstrike_bearer_token"
   */
  tokenStorageKey?: string;
}

/**
 * Real-time session management (e.g., Crowdstrike RTR)
 *
 * WHY: Some APIs require stateful, long-lived sessions for performing
 * operations. Sessions must be initialized, kept alive, and cleaned up properly.
 *
 * USED BY: Crowdstrike (Real-Time Response sessions)
 * REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/crowdstrike/rtr_session_manager.ts:17-86
 * REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/crowdstrike/crowdstrike.ts:63
 *   Code: `private crowdStrikeSessionManager: CrowdStrikeSessionManager;`
 */
export interface SessionManagementCapability {
  /**
   * Initialize a session
   *
   * REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/crowdstrike/rtr_session_manager.ts:36-86
   *   Code:
   *   ```typescript
   *   async initializeSession(
   *     payload: CrowdstrikeInitRTRParams,
   *     connectorUsageCollector: ConnectorUsageCollector
   *   ): Promise<string> {
   *     if (!this.currentBatchId) {
   *       const response = await this.apiRequest({
   *         url: this.urls.batchInitRTRSession,
   *         method: 'post',
   *         data: { host_ids: payload.endpoint_ids },
   *       });
   *       this.currentBatchId = response.batch_id;
   *       this.startRefreshInterval(connectorUsageCollector);
   *     }
   *     return this.currentBatchId;
   *   }
   *   ```
   *
   * WHY: Crowdstrike RTR requires a session to be initialized before executing
   * commands on remote hosts. The session ID is used for all subsequent operations.
   */
  initSession: (params: unknown) => Promise<{ sessionId: string }>;

  /**
   * Close a session
   *
   * REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/crowdstrike/rtr_session_manager.ts
   *   Sessions are cleaned up when no longer needed
   *
   * WHY: Sessions consume server resources and should be cleaned up. Crowdstrike
   * requires explicit session cleanup to free remote host connections.
   */
  closeSession: (sessionId: string) => Promise<void>;

  /**
   * Session timeout in ms
   *
   * REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/crowdstrike/rtr_session_manager.ts:88-104
   *   Code: Refresh interval keeps sessions alive (every 4 minutes)
   *
   * WHY: Crowdstrike RTR sessions timeout after 10 minutes of inactivity.
   * Sessions must be periodically refreshed or they'll be terminated by the server.
   */
  sessionTimeout?: number;
}

/**
 * Special capabilities union
 */
export interface SpecialCapabilities {
  multiProvider?: MultiProviderCapability;
  functionCalling?: FunctionCallingCapability;
  tokenManagement?: TokenManagementCapability;
  sessionManagement?: SessionManagementCapability;

  /**
   * Lifecycle Hooks - executed at specific points in connector lifecycle
   * These allow connectors to perform setup, validation, or cleanup operations
   */

  /**
   * Pre-save hook - runs before connector config is saved
   *
   * USED BY: Swimlane (validates API token and fetches app schema)
   * REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/swimlane/validators.ts:16-26
   *   Code: `validateCommonConfig(configObject, validatorServices)`
   *   validates URL with: `configurationUtilities.ensureUriAllowed(configObject.apiUrl)`
   * WHY: Validate configuration, enrich config with API data, check permissions
   *
   * EXAMPLE USE CASES:
   * - Validate API connectivity before saving
   * - Fetch and cache metadata (app schemas, field definitions)
   * - Transform config values
   * - Check user permissions
   */
  preSaveHook?: (params: {
    config: unknown;
    secrets: unknown;
    logger: Logger;
    services: unknown;
    isUpdate: boolean;
  }) => Promise<void>;

  /**
   * Post-save hook - runs after connector config is successfully saved
   *
   * USED BY: (Reserved for future use - audit logging, external notifications)
   * WHY: Trigger side effects after successful save (logging, notifications, provisioning)
   *
   * EXAMPLE USE CASES:
   * - Log audit events
   * - Send notifications to external systems
   * - Provision resources
   * - Update external registries
   */
  postSaveHook?: (params: {
    config: unknown;
    logger: Logger;
    services: unknown;
    wasSuccessful: boolean;
    isUpdate: boolean;
  }) => Promise<void>;

  /**
   * Post-delete hook - runs after connector is deleted
   *
   * USED BY: Crowdstrike (cleans up RTR sessions), OAuth2 connectors (revoke tokens)
   * FILE: crowdstrike/index.ts (cleanup), teams/index.ts (token revocation)
   * WHY: Clean up external resources when connector is removed
   *
   * EXAMPLE USE CASES:
   * - Close open sessions
   * - Revoke OAuth tokens
   * - Delete cached data
   * - Deregister webhooks
   * - Clean up external resources
   */
  postDeleteHook?: (params: {
    config: unknown;
    logger: Logger;
    services: unknown;
  }) => Promise<void>;
}

// ============================================================================
// CONNECTOR TESTING
// ============================================================================

/**
 * Test function to verify connector configuration
 */
export interface ConnectorTest {
  /** Test logic */
  handler: (ctx: ActionContext) => Promise<{
    ok: boolean;
    message?: string;
    [key: string]: unknown;
  }>;

  /** Description of what the test verifies */
  description?: string;
}

// ============================================================================
// REQUEST/RESPONSE TRANSFORMATIONS
// ============================================================================

/**
 * Template rendering configuration
 *
 * WHY: Connectors often need to dynamically inject runtime values (alert data,
 * user input) into request bodies. Mustache templating provides a safe, sandboxed
 * way to do this without allowing arbitrary code execution.
 */
export interface TemplateRendering {
  /**
   * Whether mustache templates are supported
   *
   * USED BY: Webhook, Email, Slack API, ES Index, and many connectors
   * REFERENCE: All connectors implementing `renderParameterTemplates`
   * WHY: Allows users to customize request bodies with dynamic data from alerts/rules
   */
  enabled: boolean;

  /**
   * Template format
   *
   * - mustache: Standard Mustache templating (most common)
   *   USED BY: Webhook, Email, Bedrock, OpenAI, Gemini, D3Security, and most connectors
   *   REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/webhook/index.ts:80-89
   *     Code:
   *     ```typescript
   *     function renderParameterTemplates(
   *       logger: Logger,
   *       params: ActionParamsType,
   *       variables: Record<string, unknown>
   *     ): ActionParamsType {
   *       if (!params.body) return params;
   *       return {
   *         body: renderMustacheString(logger, params.body, variables, 'json'),
   *       };
   *     }
   *     ```
   *   REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/bedrock/render.ts:13-27
   *     Code: `body: renderMustacheString(logger, params.subActionParams.body as string, variables, 'json')`
   *
   * - handlebars: Handlebars templating (more powerful, less common)
   *   USED BY: Complex connectors needing advanced logic
   *   WHY: Provides more features than Mustache (helpers, partials)
   *
   * - custom: Custom template engine
   *   USED BY: Specialized connectors with unique requirements
   *   WHY: Some APIs need special formatting that standard engines can't provide
   */
  format?: 'mustache' | 'handlebars' | 'custom';

  /**
   * Escaping strategy
   *
   * - json: Escape for JSON strings (most common for APIs)
   *   USED BY: Webhook, Bedrock, OpenAI, Gemini - all API connectors
   *   REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/webhook/index.ts:87
   *     Code: `renderMustacheString(logger, params.body, variables, 'json')`
   *   WHY: Prevents JSON injection and ensures valid JSON output
   *
   * - html: Escape for HTML contexts
   *   USED BY: Email connector
   *   WHY: Prevents XSS when rendering email bodies
   *
   * - markdown: Escape for Markdown contexts
   *   USED BY: Connectors posting to Markdown-based systems
   *   WHY: Prevents Markdown injection
   *
   * - none: No escaping (use with caution!)
   *   USED BY: Connectors with pre-sanitized input
   *   WHY: Maximum flexibility, but risky if input is untrusted
   */
  escaping?: 'html' | 'json' | 'markdown' | 'none';
}

/**
 * Request/response transformation
 *
 * WHY: APIs may require custom serialization, response parsing, or request/response
 * modification. Transformations provide hooks to customize data flow.
 */
export interface Transformations {
  /**
   * Mustache template rendering
   *
   * USED BY: Most connectors that support dynamic parameters
   * REFERENCE: See TemplateRendering interface above
   * WHY: Allows injecting runtime data into requests
   */
  templates?: TemplateRendering;

  /**
   * Custom request serialization
   *
   * USED BY: Connectors with non-standard request formats
   * REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/crowdstrike/crowdstrike.ts:45-49
   *   Code:
   *   ```typescript
   *   const paramsSerializer = (params: Record<string, string>) => {
   *     return Object.entries(params)
   *       .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
   *       .join('&');
   *   };
   *   ```
   * WHY: Some APIs require custom query parameter encoding or special formatting
   */
  serializeRequest?: (data: unknown) => unknown;

  /**
   * Custom response deserialization
   *
   * USED BY: Connectors parsing custom response formats
   * WHY: Some APIs return non-JSON data (XML, CSV, binary) that needs parsing
   */
  deserializeResponse?: (data: unknown) => unknown;

  /**
   * Request/response interceptors
   *
   * USED BY: Webhook, Email (OAuth2 token cleanup)
   * REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/webhook/get_axios_config.ts:77-82
   *   Code:
   *   ```typescript
   *   const { onFulfilled, onRejected } = getOauth2DeleteTokenAxiosInterceptor({
   *     configurationUtilities,
   *     logger,
   *   });
   *   axiosInstance.interceptors.response.use(onFulfilled, onRejected);
   *   ```
   * REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/email/send_email.ts:150-155
   *   Code: Similar OAuth2 token deletion interceptor
   *
   * WHY: Interceptors allow:
   * - Modifying requests before they're sent (add auth headers, logs)
   * - Processing responses before handlers see them (parse errors, cleanup tokens)
   * - Cleaning up sensitive data (OAuth2 tokens) after use
   */
  interceptors?: {
    request?: (config: unknown) => unknown | Promise<unknown>;
    response?: (response: unknown) => unknown | Promise<unknown>;
  };
}

// ============================================================================
// VALIDATION - Using Zod Refinements
// ============================================================================

/**
 * Validation using pure Zod schemas with .refine() and .superRefine()
 *
 * WHY (CR feedback): Zod is the single source of truth for validation AND UI derivation.
 * No need for separate validation layer - framework uses zod.parse() directly.
 *
 * DESIGN PRINCIPLE:
 * - Simple validation → .refine()
 * - Cross-field validation → .superRefine()
 * - Async validation → async .refine()
 *
 * @example URL allowlist validation
 * ```typescript
 * schema: z.object({
 *   apiUrl: z.string().url().refine(
 *     createUrlAllowlistRefine(configurationUtilities),
 *     { message: "URL not in allowlist" }
 *   )
 * })
 * ```
 *
 * @example Provider-specific validation
 * ```typescript
 * schema: z.object({
 *   provider: z.enum(['openai', 'azure', 'other']),
 *   apiKey: z.string().optional(),
 *   azureEndpoint: z.string().optional()
 * }).superRefine((data, ctx) => {
 *   if (data.provider === 'azure' && !data.azureEndpoint) {
 *     ctx.addIssue({
 *       code: z.ZodIssueCode.custom,
 *       path: ['azureEndpoint'],
 *       message: "Azure endpoint required"
 *     });
 *   }
 * })
 * ```
 *
 * @example Certificate + Key validation
 * ```typescript
 * schema: z.object({
 *   certificateData: z.string().optional(),
 *   privateKeyData: z.string().optional()
 * }).superRefine((data, ctx) => {
 *   const hasCert = !!data.certificateData;
 *   const hasKey = !!data.privateKeyData;
 *
 *   if (hasCert !== hasKey) {
 *     ctx.addIssue({
 *       code: z.ZodIssueCode.custom,
 *       path: hasCert ? ['privateKeyData'] : ['certificateData'],
 *       message: "Certificate and private key must both be provided"
 *     });
 *   }
 * })
 * ```
 */

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Reusable Zod refinement utilities for common validation patterns
 *
 * WHY: Share validation logic across connectors instead of duplicating it.
 * These utilities wrap common validation patterns into reusable Zod refinements.
 *
 * USAGE: Import and use in your connector's config/secrets schemas
 */

/**
 * Creates a Zod refinement for URL allowlist validation
 *
 * USED BY: Webhook, OpenAI, Bedrock, and all connectors making external HTTP calls
 * REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/openai/lib/validators.ts
 *
 * @example
 * ```typescript
 * import { createUrlAllowlistRefine } from './connector_spec';
 *
 * const configSchema = z.object({
 *   apiUrl: z.string().url().refine(
 *     createUrlAllowlistRefine(configurationUtilities),
 *     { message: "URL not in allowlist" }
 *   )
 * });
 * ```
 */
export function createUrlAllowlistRefine(configurationUtilities: {
  ensureUriAllowed: (url: string) => void;
}) {
  return (url: string) => {
    try {
      configurationUtilities.ensureUriAllowed(url);
      return true;
    } catch {
      return false;
    }
  };
}

/**
 * Creates a Zod refinement for testing API connectivity
 *
 * USED BY: Connectors that want to validate connectivity at config save time
 *
 * @example
 * ```typescript
 * const configSchema = z.object({
 *   apiUrl: z.string().url(),
 *   apiKey: z.string()
 * }).refine(
 *   createConnectivityTestRefine(async (config) => {
 *     const response = await fetch(`${config.apiUrl}/health`, {
 *       headers: { 'Authorization': `Bearer ${config.apiKey}` }
 *     });
 *     return response.ok;
 *   }),
 *   { message: "Cannot connect to API endpoint - check URL and credentials" }
 * );
 * ```
 */
export function createConnectivityTestRefine<T>(testFn: (value: T) => Promise<boolean>) {
  return async (value: T) => {
    try {
      return await testFn(value);
    } catch {
      return false;
    }
  };
}

/**
 * Validates that at least one of the specified fields is present
 *
 * USED BY: Connectors with multiple auth methods
 *
 * @example
 * ```typescript
 * const secretsSchema = z.object({
 *   apiToken: z.string().optional(),
 *   user: z.string().optional(),
 *   password: z.string().optional()
 * }).superRefine(requireAtLeastOne(['apiToken', ['user', 'password']]));
 * ```
 */
export function requireAtLeastOne(fieldGroups: Array<string | string[]>) {
  return (data: Record<string, unknown>, ctx: z.RefinementCtx) => {
    const hasAny = fieldGroups.some((group) => {
      if (Array.isArray(group)) {
        return group.every((field) => !!data[field]);
      }
      return !!data[group];
    });

    if (!hasAny) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `At least one of the following is required: ${fieldGroups
          .map((g) => (Array.isArray(g) ? `(${g.join(' + ')})` : g))
          .join(', ')}`,
      });
    }
  };
}

/**
 * Validates that certificate and private key are both present or both absent
 *
 * USED BY: OpenAI, Webhook, and connectors supporting mTLS
 * REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/openai/validators.ts
 *
 * @example
 * ```typescript
 * const secretsSchema = z.object({
 *   certificateData: z.string().optional(),
 *   privateKeyData: z.string().optional()
 * }).superRefine(requireBothOrNeither('certificateData', 'privateKeyData',
 *   'Certificate and private key must both be provided for mTLS'
 * ));
 * ```
 */
export function requireBothOrNeither(field1: string, field2: string, message?: string) {
  return (data: Record<string, unknown>, ctx: z.RefinementCtx) => {
    const has1 = !!data[field1];
    const has2 = !!data[field2];

    if (has1 !== has2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [has1 ? field2 : field1],
        message: message || `Both ${field1} and ${field2} must be provided together`,
      });
    }
  };
}

// ============================================================================
// LAYOUT & UI CONFIGURATION
// ============================================================================

/**
 * Optional layout configuration for connector UI
 *
 * WHY: While most UI can be derived from schemas, complex connectors
 * may want to customize how fields are organized and presented.
 *
 * PRINCIPLE: This is entirely optional. Without layout config:
 * - Fields render in schema definition order
 * - All config fields in one section
 * - All secret fields in another section
 * - Actions listed alphabetically
 *
 * Only specify layout when default organization isn't ideal.
 */
export interface ConnectorLayout {
  /**
   * Organize config fields into collapsible sections
   * WHY: Large forms need organization for usability
   *
   * @example
   * configSections: [
   *   { title: "Connection", fields: ["apiUrl", "timeout"], order: 1 },
   *   { title: "Advanced", fields: ["retries", "debug"], order: 2, collapsed: true }
   * ]
   */
  configSections?: Array<{
    /** Section title */
    title: string;
    /** Field names in this section */
    fields: string[];
    /** Display order (lower = shown first) */
    order?: number;
    /** Whether section starts collapsed */
    collapsed?: boolean;
    /** Help text for the entire section */
    description?: string;
  }>;

  /**
   * Group actions into categories
   * WHY: Connectors with many actions need categorization
   * Example: Crowdstrike has "Host Actions", "RTR Commands", "Agent Info"
   *
   * @example
   * actionGroups: [
   *   { title: "Send Messages", actions: ["postMessage", "postBlockkit"] },
   *   { title: "Manage Channels", actions: ["getChannels", "searchChannels"] }
   * ]
   */
  actionGroups?: Array<{
    /** Group title */
    title: string;
    /** Action names in this group */
    actions: string[];
    /** Display order */
    order?: number;
    /** Description of what these actions do */
    description?: string;
  }>;

  /**
   * Hide specific fields from UI (advanced use case)
   * WHY: Some fields might be set programmatically, not by users
   * Example: internal tracking IDs, computed values
   */
  hiddenFields?: {
    config?: string[];
    secrets?: string[];
  };

  /**
   * Custom ordering for secrets fields
   * WHY: Sometimes auth fields have logical order (username before password)
   * If not specified, uses schema definition order
   */
  secretsOrder?: string[];
}

// ============================================================================
// MAIN CONNECTOR DEFINITION
// ============================================================================

/**
 * Standard authentication schemas that connectors can import and use
 *
 * WHY: Most connectors use standard auth patterns. Instead of each connector
 * defining auth fields, import and spread these standard schemas.
 *
 * USAGE:
 * ```typescript
 * schema: z.object({
 *   url: z.string().url(),
 *   ...BasicAuthSchema,  // Adds username, password fields
 *   timeout: z.number()
 * })
 * ```
 */

/** Basic Authentication (username + password) */
export const BasicAuthSchema = z.object({
  username: z.string().describe('Username'),
  password: withUIMeta(z.string(), { sensitive: true }).describe('Password'),
});

/** Bearer Token / API Key Authentication */
export const BearerAuthSchema = z.object({
  apiKey: withUIMeta(z.string(), { sensitive: true }).describe('API Key'),
});

/** OAuth2 Client Credentials */
export const OAuth2AuthSchema = z.object({
  clientId: z.string().describe('Client ID'),
  clientSecret: withUIMeta(z.string(), { sensitive: true }).describe('Client Secret'),
  tokenUrl: z.string().url().describe('Token URL'),
  scope: z.string().optional().describe('Scope'),
});

/** SSL/mTLS Certificate Authentication */
export const SSLAuthSchema = z.object({
  certificateType: z.enum(['crt', 'pfx']).describe('Certificate Type'),
  certificate: withUIMeta(z.string(), { sensitive: true }).optional().describe('Certificate'),
  privateKey: withUIMeta(z.string(), { sensitive: true }).optional().describe('Private Key'),
  pfx: withUIMeta(z.string(), { sensitive: true }).optional().describe('PFX Bundle'),
  passphrase: withUIMeta(z.string(), { sensitive: true }).optional().describe('Passphrase'),
  ca: z.string().optional().describe('CA Certificate'),
});

/**
 * Helper function to get standard auth schemas
 *
 * @example Get basic and bearer schemas
 * ```typescript
 * schema: z.object({
 *   url: z.string(),
 *   ...getAuthSchema(['basic', 'bearer']),
 *   timeout: z.number()
 * })
 * ```
 */
export function getAuthSchema(types: Array<'basic' | 'bearer' | 'oauth2' | 'ssl'>) {
  const schemas: z.ZodRawShape = {};

  if (types.includes('basic')) {
    Object.assign(schemas, BasicAuthSchema.shape);
  }
  if (types.includes('bearer')) {
    Object.assign(schemas, BearerAuthSchema.shape);
  }
  if (types.includes('oauth2')) {
    Object.assign(schemas, OAuth2AuthSchema.shape);
  }
  if (types.includes('ssl')) {
    Object.assign(schemas, SSLAuthSchema.shape);
  }

  return schemas;
}

/**
 * Complete single-file connector definition
 * This is the interface that all connectors must satisfy
 *
 * PHILOSOPHY (aligned with CR feedback):
 * - Single schema containing config AND secrets (not separate)
 * - Secrets marked with meta.sensitive (framework encrypts them)
 * - Import standard auth schemas instead of defining from scratch
 * - Zod is the single source of truth (validation + UI derivation)
 * - Required fields = what every connector MUST have
 * - Optional fields = what some connectors need
 */
export interface SingleFileConnectorDefinition {
  // ---- Core Metadata ----
  /**
   * Connector metadata (required)
   * WHY: Every connector needs identity and basic info
   */
  metadata: ConnectorMetadata;

  // ---- Single Schema (Config + Secrets) ----
  /**
   * Single Zod schema containing ALL connector fields (config AND secrets)
   *
   * WHY (CR feedback from @cnasikas, @jcger, @adcoelho):
   * - Preserves field order for UI (config, then auth, then more config)
   * - No duplication between config/secrets schemas
   * - Secrets marked with meta.sensitive (framework encrypts these)
   * - Can import standard auth schemas: ...BasicAuthSchema, ...BearerAuthSchema
   * - Single source of truth for validation AND UI
   *
   * STRUCTURE:
   * ```typescript
   * schema: z.object({
   *   // Config fields
   *   url: z.string().url().meta({
   *     label: 'API URL',
   *     section: 'Connection',
   *     order: 1
   *   }),
   *
   *   // Secret fields (marked with meta.sensitive)
   *   apiKey: z.string().meta({
   *     sensitive: true,  // ← Framework encrypts this field
   *     label: 'API Key',
   *     section: 'Authentication',
   *     order: 2
   *   }),
   *
   *   // Or import standard auth
   *   ...BasicAuthSchema,  // Adds username, password (password already marked sensitive)
   *
   *   // More config
   *   timeout: z.number().default(30000).meta({
   *     section: 'Advanced'
   *   })
   * })
   * ```
   *
   * FRAMEWORK BEHAVIOR:
   * - Fields with `meta.sensitive = true` are encrypted before storage
   * - Field order in schema = render order in UI (unless overridden by meta.order)
   * - Sections group related fields (via meta.section)
   * - Validation uses zod.parse() directly
   */
  schema: z.ZodSchema;

  // ---- URL Validation (Framework Enforced) ----
  /**
   * Optional URL allowlist validation (framework enforced)
   *
   * WHY (Security): Prevents SSRF attacks by restricting which URLs connectors can call.
   * The framework enforces this separately as a security layer.
   *
   * Simply list field names that contain URLs to validate.
   *
   * @example
   * ```typescript
   * validateUrls: {
   *   fields: ["apiUrl", "webhookUrl", "tokenUrl"]
   * }
   * ```
   *
   * Framework will call `configurationUtilities.ensureUriAllowed()` for each field.
   */
  validateUrls?: {
    /** Field names in schema that contain URLs to validate */
    fields?: string[];
  };

  // ---- Policies ----
  /**
   * Operational policies (optional)
   * WHY: Most connectors use sensible defaults
   * Only specify when connector has special requirements
   * - Rate limiting: Most connectors retry on 429/5xx
   * - Pagination: Most connectors don't paginate
   * - Streaming: Only AI connectors need this
   */
  policies?: ConnectorPolicies;

  // ---- Actions ----
  /**
   * Map of action name to action definition (required)
   * WHY: Every connector has at least one action
   *
   * Single-action connectors: { execute: { ... } }
   * Multi-action connectors: { action1: {...}, action2: {...} }
   *
   * Each action's input schema automatically generates parameter form
   */
  actions: Record<string, ActionDefinition>;

  // ---- Testing ----
  /**
   * Test function to validate connector setup (optional but recommended)
   * WHY: Users need to verify configuration before saving
   * Test result automatically rendered as success/error message
   */
  test?: ConnectorTest;

  // ---- Layout ----
  /**
   * Optional layout configuration (optional)
   * WHY: Most connectors can use default layout
   * Only needed for complex connectors with many fields/actions
   *
   * Without this: fields render in definition order, all in one section
   * With this: custom sections, grouping, ordering
   */
  layout?: ConnectorLayout;

  // ---- Transformations ----
  /**
   * Request/response transformations (optional)
   * WHY: Most connectors don't need custom transformations
   * Template rendering is handled automatically if enabled
   */
  transformations?: Transformations;

  // ---- Special Capabilities ----
  /**
   * Special capabilities for advanced connectors (optional)
   * WHY: Only 5-7 connectors out of 30 need these
   * Examples: OAuth token refresh, multi-provider, session management
   *
   * Don't include if connector doesn't need it
   */
  capabilities?: SpecialCapabilities;
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Type guard to check if auth requires credentials
 */
export function requiresCredentials(auth: AuthConfig): boolean {
  return auth.method !== 'none' && auth.method !== 'webhook';
}

/**
 * Type guard to check if connector supports streaming
 */
export function supportsStreaming(connector: SingleFileConnectorDefinition): boolean {
  return connector.policies?.streaming?.enabled ?? false;
}

/**
 * Get all action names for a connector
 */
export function getActionNames(connector: SingleFileConnectorDefinition): string[] {
  return Object.keys(connector.actions);
}

/**
 * Check if an action is tool-compatible
 */
export function isToolAction(
  connector: SingleFileConnectorDefinition,
  actionName: string
): boolean {
  return connector.actions[actionName]?.isTool ?? false;
}

// ============================================================================
// EXAMPLE IMPLEMENTATIONS
// ============================================================================

/**
 * Example connector implementations have been moved to connector_spec_examples.ts
 *
 * SEE:
 * - SlackApiConnectorExample: Complete Slack API connector with all features
 * - MinimalConnectorExample: Minimal 30-line connector (LLM-friendly)
 * - ComplexConnectorExample: Complex connector with sections and layout
 *
 * @see connector_spec_examples.ts
 */
