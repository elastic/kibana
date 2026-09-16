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

export interface SampleDataApiService {
  /**
   * Installs a sample data set. Pass `now` (ISO 8601) to pin the reference
   * time the installer rebases document timestamps around, making the data
   * window deterministic across runs.
   */
  install: (dataSetId: string, spaceId?: string, now?: string) => Promise<void>;
  remove: (dataSetId: string, spaceId?: string) => Promise<void>;
}

export const getSampleDataApiHelper = (
  log: ScoutLogger,
  kbnClient: KbnClient
): SampleDataApiService => {
  const withSpace = (path: string, spaceId?: string) => (spaceId ? `/s/${spaceId}${path}` : path);

  return {
    install: async (dataSetId: string, spaceId?: string, now?: string) => {
      await measurePerformanceAsync(log, 'sampleDataApi.install', async () => {
        const query = now ? `?now=${encodeURIComponent(now)}` : '';
        await kbnClient.request({
          method: 'POST',
          path: withSpace(`/api/sample_data/${dataSetId}${query}`, spaceId),
          retries: 3,
        });
      });
    },

    remove: async (dataSetId: string, spaceId?: string) => {
      await measurePerformanceAsync(log, 'sampleDataApi.remove', async () => {
        await kbnClient.request({
          method: 'DELETE',
          path: withSpace(`/api/sample_data/${dataSetId}`, spaceId),
          retries: 3,
          ignoreErrors: [404],
        });
      });
    },
  };
};
