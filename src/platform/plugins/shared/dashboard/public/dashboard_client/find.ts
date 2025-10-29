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

export const find = {
  findDashboardById: async (id: string) => {
    try {
      const result = await dashboardClient.get(id);
      return {
        id,
        status: 'success',
        attributes: result.data,
        references: result.data.references ?? [],
      };
    } catch (error) {
      return { status: 'error', error };
    }
  },
  findDashboardsByIds: async (ids: string[]) => {
    return asyncMap(ids, async (id) => {
      return find.findDashboardById(id);
    });
  },
};
