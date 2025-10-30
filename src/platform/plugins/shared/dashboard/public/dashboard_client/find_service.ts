/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asyncMap } from '@kbn/std';
import { dashboardClient } from './dashboard_client';
import type { FindDashboardsByIdResponse } from './types';

export const findService = {
  findById: async (id: string): Promise<FindDashboardsByIdResponse> => {
    try {
      const result = await dashboardClient.get(id);
      return {
        id,
        status: 'success',
        attributes: result.data,
        references: result.data.references ?? [],
      };
    } catch (error) {
      return { id, status: 'error', error };
    }
  },
  findByIds: async (ids: string[]) => {
    return asyncMap(ids, async (id) => {
      return findService.findById(id);
    });
  },
  findByTitle: async (title: string) => {
    const { hits } = await dashboardClient.search({
      search: title,
      size: 10,
      options: { onlyTitle: true },
    });

    // The search isn't an exact match, lets see if we can find a single exact match to use
    const matchingDashboards = hits.filter(
      (hit) => hit.attributes.title.toLowerCase() === title.toLowerCase()
    );
    if (matchingDashboards.length === 1) {
      return { id: matchingDashboards[0].id };
    }
  },
  search: dashboardClient.search,
};
