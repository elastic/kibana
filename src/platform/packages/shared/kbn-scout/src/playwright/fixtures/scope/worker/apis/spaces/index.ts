/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpaceSolutionView } from '../../scout_space';
import type { KbnClient, ScoutLogger } from '../../../../../../common';
import { measurePerformanceAsync } from '../../../../../../common';

export interface SpacesApiService {
  create: (space: {
    id: string;
    name?: string;
    disabledFeatures?: string[];
    /** Cross-project search default NPRE for the space (serverless CPS). */
    projectRouting?: string;
  }) => Promise<void>;
  get: (id: string) => Promise<{
    id: string;
    name: string;
    projectRouting?: string;
  }>;
  delete: (id: string) => Promise<void>;
  setSolutionView: (params: { id: string; solution: SpaceSolutionView }) => Promise<void>;
  resetViewToClassic: (id: string) => Promise<void>;
}

export const getSpacesApiHelper = (log: ScoutLogger, kbnClient: KbnClient): SpacesApiService => {
  const setSolutionView: SpacesApiService['setSolutionView'] = async ({ id, solution }) => {
    await measurePerformanceAsync(
      log,
      `spacesApi.setSolutionView({id:'${id}', solution:'${solution}'})`,
      async () => {
        await kbnClient.request({
          method: 'PUT',
          path: `/internal/spaces/space/${encodeURIComponent(id)}/solution`,
          body: { solution },
        });
      }
    );
  };

  return {
    create: async ({ id, name = id, disabledFeatures = [], projectRouting }) => {
      await measurePerformanceAsync(log, `spacesApi.create(${id})`, async () => {
        await kbnClient.request({
          method: 'POST',
          path: '/api/spaces/space',
          body: {
            id,
            name,
            disabledFeatures,
            ...(projectRouting !== undefined ? { projectRouting } : {}),
          },
        });
      });
    },

    get: async (id) => {
      return measurePerformanceAsync(log, `spacesApi.get(${id})`, async () => {
        const { data } = await kbnClient.request<{
          id: string;
          name: string;
          projectRouting?: string;
        }>({
          method: 'GET',
          path: `/api/spaces/space/${encodeURIComponent(id)}`,
        });
        return data;
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

    setSolutionView,

    resetViewToClassic: async (id) => {
      await setSolutionView({ id, solution: 'classic' });
    },
  };
};
