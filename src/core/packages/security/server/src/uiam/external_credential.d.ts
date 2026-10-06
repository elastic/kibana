import type { KibanaRequest } from '@kbn/core-http-server';
/**
 * Marks a fake request as carrying a user-created (external) UIAM credential, so the Elasticsearch
 * cluster client does not attach the UIAM shared secret to it. Call it on the request returned by
 * `kibanaRequestFactory()`.
 *
 * Misuse is fail-closed in both directions: marking a Kibana-minted credential merely withholds the
 * shared secret, so that credential fails to authenticate, and marking can never cause the shared
 * secret to be attached.
 */
export declare function markExternalUiamCredential(request: KibanaRequest): void;
/**
 * Whether the request was marked as carrying a user-created (external) UIAM credential. Anything
 * unmarked, including every real request, is treated as internal (fail closed).
 */
export declare function isExternalUiamCredential(request: KibanaRequest): boolean;
