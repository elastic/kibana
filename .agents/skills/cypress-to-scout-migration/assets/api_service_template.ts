/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger, ScoutParallelWorkerFixtures } from '@kbn/scout-security';
import { measurePerformanceAsync } from '@kbn/scout-security';

const TODO_API_URL = '/api/TODO_ENDPOINT';

export interface TODOApiService {
  create: (body: Record<string, unknown>) => Promise<void>;
  deleteAll: () => Promise<void>;
}

export const getTODOApiService = ({
  kbnClient,
  log,
  scoutSpace,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];
}): TODOApiService => {
  const basePath = scoutSpace?.id ? `/s/${scoutSpace?.id}` : '';

  return {
    create: async (body) => {
      await measurePerformanceAsync(log, 'security.todo.create', async () => {
        await kbnClient.request({
          method: 'POST',
          path: `${basePath}${TODO_API_URL}`,
          body,
          retries: 0,
        });
      });
    },

    deleteAll: async () => {
      await measurePerformanceAsync(log, 'security.todo.deleteAll', async () => {
        // TODO: implement bulk delete or list-then-delete
        await kbnClient.request({
          method: 'DELETE',
          path: `${basePath}${TODO_API_URL}`,
          body: { savedObjectIds: [] },
        });
      });
    },
  };
};

// After creating the API service:
// 1. Export from kbn-scout-security/src/playwright/fixtures/worker/apis/index.ts
// 2. Add to SecurityApiServicesFixture in kbn-scout-security/src/playwright/fixtures/types.ts
// 3. Wire into parallel_run_fixtures.ts and single_thread_fixtures.ts
