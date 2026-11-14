/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSessionApiDataInput } from '@kbn/as-code-discover-schema';
import type { KbnClient, ScoutLogger } from '../../../../../../common';
import { measurePerformanceAsync } from '../../../../../../common';
import { DISCOVER_SESSION_API_PATH, DISCOVER_SESSION_API_VERSION } from './constants';

export { DISCOVER_SESSION_API_PATH, DISCOVER_SESSION_API_VERSION } from './constants';

/**
 * Discover Sessions API Service
 * Provides methods to interact with Kibana's Discover Sessions API
 */
export interface DiscoverApiService {
  /**
   * Create a Discover session via the API and return its id.
   * @param body - Discover session create request body
   * @param spaceId - Optional space id to create the session in
   */
  create: (body: DiscoverSessionApiDataInput, spaceId?: string) => Promise<string>;
  /**
   * Fully replace an existing Discover session via the upsert API.
   * @param id - Id of the Discover session to replace
   * @param body - Discover session request body
   * @param spaceId - Optional space id the session lives in
   */
  update: (id: string, body: DiscoverSessionApiDataInput, spaceId?: string) => Promise<void>;
}

/**
 * Factory function to create a Discover Sessions API service helper
 * @param log - Scout logger instance
 * @param kbnClient - Kibana client for making API requests
 * @returns DiscoverApiService instance
 */
export const getDiscoverApiHelper = (
  log: ScoutLogger,
  kbnClient: KbnClient
): DiscoverApiService => {
  const withSpace = (path: string, spaceId?: string) =>
    spaceId ? `/s/${spaceId}/${path}` : `/${path}`;

  return {
    create: async (body, spaceId) => {
      return await measurePerformanceAsync(log, 'discoverApi.create', async (): Promise<string> => {
        const response = await kbnClient.request<unknown>({
          method: 'POST',
          path: withSpace(DISCOVER_SESSION_API_PATH, spaceId),
          body,
          headers: { 'elastic-api-version': DISCOVER_SESSION_API_VERSION },
        });

        if (response.status !== 201) {
          throw new Error(
            `Expected Discover session create status 201, got ${response.status}: ${JSON.stringify(
              response.data
            )}`
          );
        }

        const { id } = response.data as Record<string, unknown>;
        if (typeof id !== 'string' || id.length === 0) {
          throw new Error('Discover session create response: expected a non-empty string id');
        }
        return id;
      });
    },

    update: async (id, body, spaceId) => {
      await measurePerformanceAsync(log, 'discoverApi.update', async () => {
        const response = await kbnClient.request<unknown>({
          method: 'PUT',
          path: withSpace(`${DISCOVER_SESSION_API_PATH}/${id}`, spaceId),
          body,
          headers: { 'elastic-api-version': DISCOVER_SESSION_API_VERSION },
        });

        if (response.status !== 200) {
          throw new Error(
            `Expected Discover session update status 200, got ${response.status}: ${JSON.stringify(
              response.data
            )}`
          );
        }
      });
    },
  };
};
