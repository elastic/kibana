/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnClient, ScoutLogger } from '../../../../../../common';
import { measurePerformanceAsync } from '../../../../../../common';
import type {
  ApiResponse,
  ApiStatusResponse,
  CreateAPIKeyParams,
  CreateApiKeyResponse,
  InvalidateAPIKeyParams,
  InvalidateAPIKeyResult,
  QueryAPIKeyParams,
  QueryAPIKeyResult,
  UpdateAPIKeyParams,
  UpdateAPIKeyResult,
} from './types';

export type {
  ApiResponse,
  ApiStatusResponse,
  CreateAPIKeyParams,
  CreateApiKeyResponse,
  UpdateAPIKeyParams,
  UpdateAPIKeyResult,
  QueryAPIKeyParams,
  QueryAPIKeyResult,
  ApiKey,
  ApiKeyToInvalidate,
  InvalidateAPIKeyParams,
  InvalidateAPIKeyResult,
} from './types';

/**
 * API service for managing API keys in Kibana
 */
export interface ApiKeysApiService {
  /**
   * Create a new API key
   * @param params - API key creation parameters
   * @returns Created API key details
   * @example
   * ```ts
   * const apiKey = await apiServices.apiKeys.create({
   *   name: 'my-api-key',
   *   expiration: '7d',
   *   role_descriptors: {
   *     my_role: {
   *       cluster: ['all'],
   *       indices: [{ names: ['*'], privileges: ['read'] }]
   *     }
   *   }
   * });
   * ```
   */
  create: (params: CreateAPIKeyParams) => Promise<ApiResponse<CreateApiKeyResponse>>;

  /**
   * Update an existing API key's role descriptors or metadata
   * @param params - API key update parameters
   * @returns Update result
   * @example
   * ```ts
   * const result = await apiServices.apiKeys.update({
   *   id: 'key-id',
   *   role_descriptors: { updated_role: { cluster: ['monitor'] } },
   *   metadata: { updated: true }
   * });
   * ```
   */
  update: (params: UpdateAPIKeyParams) => Promise<ApiResponse<UpdateAPIKeyResult>>;

  /**
   * Query API keys with filtering and pagination
   * @param params - Query parameters (optional)
   * @returns Query results containing matching API keys
   * @example
   * ```ts
   * const results = await apiServices.apiKeys.query({
   *   filters: { type: 'rest', expired: false },
   *   from: 0,
   *   size: 100
   * });
   * ```
   */
  query: (params?: QueryAPIKeyParams) => Promise<ApiResponse<QueryAPIKeyResult>>;

  /**
   * Invalidate (delete) one or more API keys
   * @param params - Invalidation parameters
   * @returns Invalidation result with successful and failed operations
   * @example
   * ```ts
   * const result = await apiServices.apiKeys.invalidate({
   *   apiKeys: [{ id: 'key-1', name: 'test-key' }],
   *   isAdmin: false
   * });
   * ```
   */
  invalidate: (params: InvalidateAPIKeyParams) => Promise<ApiResponse<InvalidateAPIKeyResult>>;

  /**
   * Cleanup utilities for managing API keys in tests
   */
  cleanup: {
    /**
     * Delete all API keys in the cluster
     * @returns Status of the operation
     * @example
     * ```ts
     * await apiServices.apiKeys.cleanup.deleteAll();
     * ```
     */
    deleteAll: () => Promise<ApiStatusResponse>;

    /**
     * Delete API keys by name pattern
     * @param namePattern - Name or pattern to match (supports wildcards)
     * @returns Status of the operation
     * @example
     * ```ts
     * await apiServices.apiKeys.cleanup.deleteByName('test-*');
     * ```
     */
    deleteByName: (namePattern: string) => Promise<ApiStatusResponse>;

    /**
     * Delete API keys by IDs
     * @param ids - Array of API key IDs to delete
     * @returns Status of the operation
     * @example
     * ```ts
     * await apiServices.apiKeys.cleanup.deleteByIds(['id1', 'id2']);
     * ```
     */
    deleteByIds: (ids: string[]) => Promise<ApiStatusResponse>;
  };
}

/**
 * Get the API Keys API helper
 * @param log - Scout logger instance
 * @param kbnClient - Kibana client instance
 * @returns API Keys service
 */
export const getApiKeysApiHelper = (log: ScoutLogger, kbnClient: KbnClient): ApiKeysApiService => {
  const apiKeysUrl = '/internal/security/api_key';

  /**
   * Helper to query all API keys
   * @param params - Optional query parameters
   * @returns Array of all API key IDs and names
   */
  const queryAllApiKeys = async (
    params?: QueryAPIKeyParams
  ): Promise<Array<{ id: string; name: string }>> => {
    const response = await kbnClient.request({
      method: 'POST',
      path: `${apiKeysUrl}/_query`,
      retries: 3,
      body: {
        ...params,
        from: params?.from || 0,
        size: params?.size || 10000, // Get a large number to ensure we get all keys
      },
    });

    const queryResult = response.data as QueryAPIKeyResult;
    return queryResult.apiKeys.map((key) => ({ id: key.id, name: key.name }));
  };

  return {
    create: async (params) => {
      return await measurePerformanceAsync(log, `apiKeysApi.create [${params.name}]`, async () => {
        const response = await kbnClient.request({
          method: 'POST',
          path: apiKeysUrl,
          retries: 3,
          body: params,
        });
        return { data: response.data as CreateApiKeyResponse, status: response.status };
      });
    },

    update: async (params) => {
      return await measurePerformanceAsync(log, `apiKeysApi.update [${params.id}]`, async () => {
        const response = await kbnClient.request({
          method: 'PUT',
          path: apiKeysUrl,
          retries: 3,
          body: params,
        });
        return { data: response.data as UpdateAPIKeyResult, status: response.status };
      });
    },

    query: async (params) => {
      return await measurePerformanceAsync(log, 'apiKeysApi.query', async () => {
        const response = await kbnClient.request({
          method: 'POST',
          path: `${apiKeysUrl}/_query`,
          retries: 3,
          body: params || {},
        });
        return { data: response.data as QueryAPIKeyResult, status: response.status };
      });
    },

    invalidate: async (params) => {
      return await measurePerformanceAsync(
        log,
        `apiKeysApi.invalidate [${params.apiKeys.length} keys]`,
        async () => {
          const response = await kbnClient.request({
            method: 'POST',
            path: `${apiKeysUrl}/invalidate`,
            retries: 3,
            body: params,
          });
          return { data: response.data as InvalidateAPIKeyResult, status: response.status };
        }
      );
    },

    cleanup: {
      deleteAll: async () => {
        return await measurePerformanceAsync(log, 'apiKeysApi.cleanup.deleteAll', async () => {
          const allKeys = await queryAllApiKeys();

          if (allKeys.length === 0) {
            log.debug('No API keys to delete');
            return { status: 200 };
          }

          const response = await kbnClient.request({
            method: 'POST',
            path: `${apiKeysUrl}/invalidate`,
            retries: 3,
            body: {
              apiKeys: allKeys,
              isAdmin: true,
            },
            ignoreErrors: [404],
          });

          return { status: response.status };
        });
      },

      deleteByName: async (namePattern) => {
        return await measurePerformanceAsync(
          log,
          `apiKeysApi.cleanup.deleteByName [${namePattern}]`,
          async () => {
            // Query for API keys matching the name pattern
            const queryResponse = await kbnClient.request({
              method: 'POST',
              path: `${apiKeysUrl}/_query`,
              retries: 3,
              body: {
                query: {
                  wildcard: {
                    name: namePattern,
                  },
                },
                size: 10000,
              },
            });

            const queryResult = queryResponse.data as QueryAPIKeyResult;
            const keysToDelete = queryResult.apiKeys.map((key) => ({
              id: key.id,
              name: key.name,
            }));

            if (keysToDelete.length === 0) {
              log.debug(`No API keys found matching pattern: ${namePattern}`);
              return { status: 200 };
            }

            const response = await kbnClient.request({
              method: 'POST',
              path: `${apiKeysUrl}/invalidate`,
              retries: 3,
              body: {
                apiKeys: keysToDelete,
                isAdmin: true,
              },
              ignoreErrors: [404],
            });

            return { status: response.status };
          }
        );
      },

      deleteByIds: async (ids) => {
        return await measurePerformanceAsync(
          log,
          `apiKeysApi.cleanup.deleteByIds [${ids.length} keys]`,
          async () => {
            if (ids.length === 0) {
              return { status: 200 };
            }

            // First, we need to get the names of these keys
            const queryResponse = await kbnClient.request({
              method: 'POST',
              path: `${apiKeysUrl}/_query`,
              retries: 3,
              body: {
                query: {
                  ids: {
                    values: ids,
                  },
                },
                size: ids.length,
              },
            });

            const queryResult = queryResponse.data as QueryAPIKeyResult;
            const keysToDelete = queryResult.apiKeys.map((key) => ({
              id: key.id,
              name: key.name,
            }));

            if (keysToDelete.length === 0) {
              log.debug('No API keys found with the provided IDs');
              return { status: 200 };
            }

            const response = await kbnClient.request({
              method: 'POST',
              path: `${apiKeysUrl}/invalidate`,
              retries: 3,
              body: {
                apiKeys: keysToDelete,
                isAdmin: true,
              },
              ignoreErrors: [404],
            });

            return { status: response.status };
          }
        );
      },
    },
  };
};
