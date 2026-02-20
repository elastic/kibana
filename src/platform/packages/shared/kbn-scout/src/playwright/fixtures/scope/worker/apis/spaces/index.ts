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

export interface SpacesApiService {
  create: (space: { id: string; name: string }) => Promise<void>;
  delete: (id: string) => Promise<void>;
}

export const getSpacesApiHelper = (log: ScoutLogger, kbnClient: KbnClient): SpacesApiService => {
  return {
    create: async (space: { id: string; name: string }) => {
      await measurePerformanceAsync(log, `spacesApi.create(${space.id})`, async () => {
        await kbnClient.request({
          method: 'POST',
          path: '/api/spaces/space',
          body: space,
        });
      });
    },

    delete: async (id: string) => {
      await measurePerformanceAsync(log, `spacesApi.delete(${id})`, async () => {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/spaces/space/${encodeURIComponent(id)}`,
          ignoreErrors: [404],
        });
      });
    },
  };
};
