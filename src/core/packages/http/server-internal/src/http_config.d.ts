import type { Duration } from 'moment';
import type { ByteSizeValue, TypeOf } from '@kbn/config-schema';
import type { IHttpConfig } from '@kbn/server-http-tools';
import { SslConfig } from '@kbn/server-http-tools';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import type { HttpProtocol, ICspConfig, IExternalUrlConfig } from '@kbn/core-http-server';
import type { IHttpEluMonitorConfig } from '@kbn/core-http-server/src/elu_monitor';
import type { HandlerResolutionStrategy } from '@kbn/core-http-router-server-internal';
import type { CspConfigType } from './csp';
import type { ExternalUrlConfig } from './external_url';
import { CdnConfig } from './cdn_config';
import type { PermissionsPolicyConfigType } from './permissions_policy';
import { type RateLimiterConfig } from './rate_limiter';
/**
 * We assume the URL does not contain anything after the pathname so that
 * we can safely append values to the pathname at runtime.
 */
export declare const validateCdnURL: (urlString: string) => string | undefined;
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string>;
    autoListen: import("@kbn/config-schema").Type<boolean>;
    publicBaseUrl: import("@kbn/config-schema").Type<string | undefined>;
    basePath: import("@kbn/config-schema").Type<string | undefined>;
    shutdownTimeout: import("@kbn/config-schema").Type<Duration>;
    cdn: import("@kbn/config-schema").ObjectType<{
        url: import("@kbn/config-schema").Type<string | null | undefined>;
    }>;
    oas: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
    }>;
    cors: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
        allowCredentials: import("@kbn/config-schema").Type<boolean>;
        allowOrigin: import("@kbn/config-schema").Type<string[] | "*"[]>;
    }>;
    securityResponseHeaders: import("@kbn/config-schema").ObjectType<{
        strictTransportSecurity: import("@kbn/config-schema").Type<string | null>;
        xContentTypeOptions: import("@kbn/config-schema").Type<"nosniff" | null>;
        referrerPolicy: import("@kbn/config-schema").Type<"origin" | "no-referrer" | "no-referrer-when-downgrade" | "origin-when-cross-origin" | "same-origin" | "strict-origin" | "strict-origin-when-cross-origin" | "unsafe-url" | null>;
        permissionsPolicy: import("@kbn/config-schema").Type<string | null>;
        permissionsPolicyReportOnly: import("@kbn/config-schema").Type<string | null | undefined>;
        disableEmbedding: import("@kbn/config-schema").Type<boolean>;
        crossOriginOpenerPolicy: import("@kbn/config-schema").Type<"same-origin" | "unsafe-none" | "same-origin-allow-popups" | null>;
    }>;
    customResponseHeaders: import("@kbn/config-schema").Type<Record<string, any>>;
    protocol: import("@kbn/config-schema").ConditionalType<import("@kbn/config-schema").Type<true>, "http2" | "http1", "http2" | "http1">;
    prototypeHardening: import("@kbn/config-schema").Type<boolean>;
    host: import("@kbn/config-schema").Type<string>;
    maxPayload: import("@kbn/config-schema").Type<ByteSizeValue>;
    port: import("@kbn/config-schema").Type<number>;
    rewriteBasePath: import("@kbn/config-schema").Type<boolean>;
    ssl: import("@kbn/config-schema").ObjectType<{
        certificate: import("@kbn/config-schema").Type<string | undefined>;
        certificateAuthorities: import("@kbn/config-schema").Type<string | string[] | undefined>;
        cipherSuites: import("@kbn/config-schema").Type<string[]>;
        enabled: import("@kbn/config-schema").Type<boolean>;
        key: import("@kbn/config-schema").Type<string | undefined>;
        keyPassphrase: import("@kbn/config-schema").Type<string | undefined>;
        keystore: import("@kbn/config-schema").ObjectType<{
            path: import("@kbn/config-schema").Type<string | undefined>;
            password: import("@kbn/config-schema").Type<string | undefined>;
        }>;
        truststore: import("@kbn/config-schema").ObjectType<{
            path: import("@kbn/config-schema").Type<string | undefined>;
            password: import("@kbn/config-schema").Type<string | undefined>;
        }>;
        redirectHttpFromPort: import("@kbn/config-schema").Type<number | undefined>;
        supportedProtocols: import("@kbn/config-schema").Type<string[]>;
        clientAuthentication: import("@kbn/config-schema").Type<"optional" | "none" | "required">;
    }>;
    keepaliveTimeout: import("@kbn/config-schema").Type<number>;
    socketTimeout: import("@kbn/config-schema").Type<number>;
    payloadTimeout: import("@kbn/config-schema").Type<number>;
    http2: import("@kbn/config-schema").ObjectType<{
        allowUnsecure: import("@kbn/config-schema").Type<boolean>;
    }>;
    compression: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
        brotli: import("@kbn/config-schema").ObjectType<{
            enabled: import("@kbn/config-schema").Type<boolean>;
            quality: import("@kbn/config-schema").Type<number>;
        }>;
        referrerWhitelist: import("@kbn/config-schema").Type<string[] | undefined>;
    }>;
    uuid: import("@kbn/config-schema").Type<string | undefined>;
    xsrf: import("@kbn/config-schema").ObjectType<{
        disableProtection: import("@kbn/config-schema").Type<boolean>;
        allowlist: import("@kbn/config-schema").Type<string[]>;
    }>;
    excludeRoutes: import("@kbn/config-schema").Type<string[]>;
    eluMonitor: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
        logging: import("@kbn/config-schema").ObjectType<{
            enabled: import("@kbn/config-schema").ConditionalType<false, boolean, boolean>;
            threshold: import("@kbn/config-schema").ObjectType<{
                elu: import("@kbn/config-schema").Type<number>;
                ela: import("@kbn/config-schema").Type<number>;
            }>;
        }>;
    }>;
    rateLimiter: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
        elu: import("@kbn/config-schema").ConditionalType<false, never, number>;
        term: import("@kbn/config-schema").ConditionalType<false, never, "short" | "medium" | "long">;
    }>;
    requestId: import("@kbn/config-schema").ObjectType<{
        allowFromAnyIp: import("@kbn/config-schema").Type<boolean>;
        ipAllowlist: import("@kbn/config-schema").Type<string[]>;
    }>;
    restrictInternalApis: import("@kbn/config-schema").Type<boolean>;
    versioned: import("@kbn/config-schema").ObjectType<{
        /**
         * Which handler resolution algo to use for public routes: "newest" or "oldest".
         *
         * @note Internal routes always require a version to be specified.
         * @note in development we have an additional option "none".
         *       This prevents any fallbacks and requires that a version specified.
         *       Useful for ensuring that a given client always specifies a version.
         */
        versionResolution: import("@kbn/config-schema").ConditionalType<true, "none" | "oldest" | "newest", "oldest" | "newest">;
        /**
         * Whether we require the Kibana browser build version to match the Kibana server build version.
         *
         * This number is determined when a distributable version of Kibana is built and ensures that only
         * same-build browsers can access the Kibana server.
         */
        strictClientVersionCheck: import("@kbn/config-schema").Type<boolean>;
        /** This should not be configurable in serverless */
        useVersionResolutionStrategyForInternalPaths: import("@kbn/config-schema").ConditionalType<true, string[], string[]>;
    }>;
    serverTiming: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
    serverTimingElasticsearch: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
}>;
export type HttpConfigType = TypeOf<typeof configSchema>;
export declare const config: ServiceConfigDescriptor<HttpConfigType>;
export declare class HttpConfig implements IHttpConfig {
    name: string;
    autoListen: boolean;
    protocol: HttpProtocol;
    host: string;
    keepaliveTimeout: number;
    socketTimeout: number;
    payloadTimeout: number;
    port: number;
    cors: {
        enabled: boolean;
        allowCredentials: boolean;
        allowOrigin: string[];
    };
    oas: {
        enabled: boolean;
    };
    securityResponseHeaders: Record<string, string | string[]>;
    customResponseHeaders: Record<string, string | string[]>;
    maxPayload: ByteSizeValue;
    basePath?: string;
    publicBaseUrl?: string;
    rewriteBasePath: boolean;
    cdn: CdnConfig;
    ssl: SslConfig;
    compression: {
        enabled: boolean;
        referrerWhitelist?: string[];
        brotli: {
            enabled: boolean;
            quality: number;
        };
    };
    csp: ICspConfig;
    prototypeHardening: boolean;
    externalUrl: IExternalUrlConfig;
    xsrf: {
        disableProtection: boolean;
        allowlist: string[];
    };
    excludeRoutes: string[];
    requestId: {
        allowFromAnyIp: boolean;
        ipAllowlist: string[];
    };
    versioned: {
        versionResolution: HandlerResolutionStrategy;
        strictClientVersionCheck: boolean;
        useVersionResolutionStrategyForInternalPaths: string[];
    };
    shutdownTimeout: Duration;
    restrictInternalApis: boolean;
    rateLimiter: RateLimiterConfig;
    serverTiming: boolean;
    serverTimingElasticsearch: boolean;
    eluMonitor: IHttpEluMonitorConfig;
    /**
     * @internal
     */
    constructor(rawHttpConfig: HttpConfigType, rawCspConfig: CspConfigType, rawExternalUrlConfig: ExternalUrlConfig, rawPermissionsPolicyConfig: PermissionsPolicyConfigType);
}
export {};
