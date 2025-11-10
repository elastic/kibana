import { z } from '@kbn/zod';
import type { Logger } from '@kbn/core/server';
import type { AxiosInstance } from 'axios';
import { i18n } from '@kbn/i18n';
export { withUIMeta, UISchemas } from './connector_spec_ui';

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

export interface ConnectorMetadata {
    id: string;
    displayName: string;
    icon?: string;
    description: string;
    docsUrl?: string;
    minimumLicense: 'basic' | 'gold' | 'platinum' | 'enterprise';
    supportedFeatureIds: Array<'alerting' | 'cases' | 'uptime' | 'security' | 'siem' | 'generativeAIForSecurity' | 'generativeAIForObservability' | 'generativeAIForSearchPlayground' | 'endpointSecurity'>;
}

export const AuthSchema = z.discriminatedUnion('method', [
    z.object({
        method: z.literal('none'),
    }),
    z.object({
        method: z.literal('basic'),
        credentials: z.object({
            username: z.string(),
            password: z.string(),
        }),
    }),
    z.object({
        method: z.literal('bearer'),
        token: z.string().describe('Bearer token or API key'),
    }),
    z.object({
        method: z.literal('headers'),
        headers: z.record(z.string(), z.string()),
    }),
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
    z.object({
        method: z.literal('aws_sig_v4'),
        credentials: z.object({
            accessKey: z.string(),
            secretKey: z.string(),
            region: z.string().optional(),
            service: z.string().optional(),
        }),
    }),
    z.object({
        method: z.literal('webhook'),
        url: z.string().url(),
        extraHeaders: z.record(z.string(), z.string()).optional(),
    }),
]);

export type AuthConfig = z.infer<typeof AuthSchema>;

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
    supportsStreaming?: boolean;
}

export interface ActionContext {
    auth: AuthConfig;
    log: Logger;
    client?: AxiosInstance;
    config?: Record<string, unknown>;
    connectorUsageCollector?: unknown;
}

export interface MultiProviderCapability {
    providers: Array<{
        id: string;
        name: string;
        requiredConfig?: string[];
        requiredSecrets?: string[];
    }>;
    selectedProvider: string;
}

export interface FunctionCallingCapability {
    supported: boolean;
    format?: 'openai' | 'anthropic' | 'generic';
    toolUseEnabled?: boolean;
}

export interface TokenManagementCapability {
    refreshToken?: (currentToken: string) => Promise<string>;
    isTokenExpired?: (token: string) => boolean;
    tokenStorageKey?: string;
}

export interface SessionManagementCapability {
    initSession: (params: unknown) => Promise<{
        sessionId: string;
    }>;
    closeSession: (sessionId: string) => Promise<void>;
    sessionTimeout?: number;
}

export interface SpecialCapabilities {
    multiProvider?: MultiProviderCapability;
    functionCalling?: FunctionCallingCapability;
    tokenManagement?: TokenManagementCapability;
    sessionManagement?: SessionManagementCapability;
    preSaveHook?: (params: {
        config: unknown;
        secrets: unknown;
        logger: Logger;
        services: unknown;
        isUpdate: boolean;
    }) => Promise<void>;
    postSaveHook?: (params: {
        config: unknown;
        logger: Logger;
        services: unknown;
        wasSuccessful: boolean;
        isUpdate: boolean;
    }) => Promise<void>;
    postDeleteHook?: (params: {
        config: unknown;
        logger: Logger;
        services: unknown;
    }) => Promise<void>;
}

export interface ConnectorTest {
    handler: (ctx: ActionContext) => Promise<{
        ok: boolean;
        message?: string;
        [key: string]: unknown;
    }>;
    description?: string;
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

export interface ValidationConfig {
    configSchema: z.ZodSchema;
    secretsSchema: z.ZodSchema;
    validateUrls?: {
        configFields?: string[];
        secretFields?: string[];
    };
}

export function createUrlAllowlistRefine(configurationUtilities: {
    ensureUriAllowed: (url: string) => void;
}) {
    return (url: string) => {
        try {
            configurationUtilities.ensureUriAllowed(url);
            return true;
        }
        catch {
            return false;
        }
    };
}

export function createConnectivityTestRefine<T>(testFn: (value: T) => Promise<boolean>) {
    return async (value: T) => {
        try {
            return await testFn(value);
        }
        catch {
            return false;
        }
    };
}

export function requireAtLeastOne(fieldGroups: Array<string | string[]>) {
    return (data: any, ctx: z.RefinementCtx) => {
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

export function requireBothOrNeither(field1: string, field2: string, message?: string) {
    return (data: any, ctx: z.RefinementCtx) => {
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

export interface ConnectorLayout {
    configSections?: Array<{
        title: string;
        fields: string[];
        order?: number;
        collapsed?: boolean;
        description?: string;
    }>;
    actionGroups?: Array<{
        title: string;
        actions: string[];
        order?: number;
        description?: string;
    }>;
    hiddenFields?: {
        config?: string[];
        secrets?: string[];
    };
    secretsOrder?: string[];
}

export interface SingleFileConnectorDefinition {
    metadata: ConnectorMetadata;
    authSchema: z.ZodTypeAny;
    validation: ValidationConfig;
    policies?: ConnectorPolicies;
    actions: Record<string, ActionDefinition>;
    test?: ConnectorTest;
    layout?: ConnectorLayout;
    transformations?: Transformations;
    capabilities?: SpecialCapabilities;
}

export function requiresCredentials(auth: AuthConfig): boolean {
    return auth.method !== 'none' && auth.method !== 'webhook';
}

export function supportsStreaming(connector: SingleFileConnectorDefinition): boolean {
    return connector.policies?.streaming?.enabled ?? false;
}

export function getActionNames(connector: SingleFileConnectorDefinition): string[] {
    return Object.keys(connector.actions);
}

export function isToolAction(connector: SingleFileConnectorDefinition, actionName: string): boolean {
    return connector.actions[actionName]?.isTool ?? false;
}
