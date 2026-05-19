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
export declare function createI18nKeys(connectorId: string): {
    metadata: (key: string) => string;
    config: (key: string) => string;
    secrets: (key: string) => string;
    actions: (actionName: string, key: string) => string;
    validation: (key: string) => string;
    test: (key: string) => string;
};
export interface ConnectorMetadata {
    id: string;
    displayName: string;
    icon?: string;
    description: string;
    docsUrl?: string;
    minimumLicense: LicenseType;
    isTechnicalPreview?: boolean;
    supportedFeatureIds: Array<'alerting' | 'cases' | 'uptime' | 'siem' | 'generativeAIForSecurity' | 'generativeAIForObservability' | 'generativeAIForSearchPlayground' | 'endpointSecurity' | 'workflows' | 'agentBuilder'>;
}
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
export declare const RETRY_RATE_LIMIT: readonly [429, 503];
export declare const RETRY_SERVER_ERRORS: readonly [500, 502, 503, 504];
export declare const RETRY_GATEWAY_ERRORS: readonly [502, 503, 504];
export declare const RETRY_TIMEOUT_AND_RATE_LIMIT: readonly [408, 429, 503];
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
    classifyError?: (error: {
        status?: number;
        message?: string;
    }) => 'user' | 'system' | 'unknown';
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
export interface ActionContext {
    client: AxiosInstance;
    config?: Record<string, unknown>;
    connectorUsageCollector?: unknown;
    log: Logger;
    secrets?: Record<string, unknown>;
}
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
export interface ConnectorTest {
    handler: (ctx: ActionContext) => Promise<{
        ok: boolean;
        message?: string;
        [key: string]: unknown;
    }>;
    description?: string;
}
export interface AuthTypeDef {
    type: string;
    defaults: Record<string, unknown>;
    overrides?: {
        meta?: Record<string, Record<string, unknown>>;
    };
}
export interface ConnectorSpec {
    metadata: ConnectorMetadata;
    auth?: {
        types: Array<string | AuthTypeDef>;
        headers?: Record<string, AxiosHeaderValue>;
    };
    schema?: z.ZodObject;
    validateUrls?: {
        fields?: string[];
    };
    policies?: ConnectorPolicies;
    actions: Record<string, ActionDefinition<any, any, any>>;
    test?: ConnectorTest;
    transformations?: Transformations;
    skill?: string;
}
export declare function requiresCredentials(auth: {
    method: string;
}): boolean;
export declare function supportsStreaming(connector: ConnectorSpec): boolean;
export declare function getActionNames(connector: ConnectorSpec): string[];
export declare function isToolAction(connector: ConnectorSpec, actionName: string): boolean;
