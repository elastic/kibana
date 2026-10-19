import type { RequestOptions } from '../types/latest';
/**
 * Builds a Kibana HTTP request from connector definitions
 * This is shared between the execution engine and the YAML editor copy functionality
 */
export declare function buildKibanaRequest(actionType: string, params: Record<string, unknown>, spaceId?: string): RequestOptions;
/**
 * Applies the space prefix to the path for non-default spaces
 * Following Kibana's standard space-aware API pattern: /s/{spaceId}/api/...
 */
export declare function applySpacePrefix(path: string, spaceId?: string): string;
