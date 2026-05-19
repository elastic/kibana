import type { OnPostAuthHandler, OnPreAuthHandler, OnPreResponseHandler } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { HttpConfig } from './http_config';
export declare const createXsrfPostAuthHandler: (config: HttpConfig) => OnPostAuthHandler;
export declare const createExcludeRoutesPreAuthHandler: (config: HttpConfig, log: Logger) => OnPreAuthHandler;
/**
 * This should remain part of the logger prefix so that we can notify/track
 * when we see this logged for observability purposes.
 */
export declare const INTERNAL_API_RESTRICTED_LOGGER_NAME = "kbn-internal-api-restricted";
export declare const createRestrictInternalRoutesPostAuthHandler: (config: HttpConfig, log: Logger) => OnPostAuthHandler;
export declare const createVersionCheckPostAuthHandler: (kibanaVersion: string) => OnPostAuthHandler;
export declare const createCustomHeadersPreResponseHandler: (config: HttpConfig) => OnPreResponseHandler;
export declare const createDeprecationWarningHeaderPreResponseHandler: (kibanaVersion: string) => OnPreResponseHandler;
export declare const createBuildNrMismatchLoggerPreResponseHandler: (serverBuildNumber: number, log: Logger) => OnPreResponseHandler;
