import type { InvalidateAPIKeyResult } from '../authentication/api_keys/api_keys';
/**
 * Checks whether the UIAM invalidation response indicates the API key no longer exists.
 */
export declare const isMissingApiKey: (response: InvalidateAPIKeyResult | null) => boolean;
/**
 * Checks whether the UIAM invalidation response indicates the API key was already revoked.
 */
export declare const isRevokedApiKey: (response: InvalidateAPIKeyResult | null) => boolean;
