/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { dashboardClient } from './dashboard_client';

interface Context {
  onResults: (dashboards: Array<{ id: string; isManaged: boolean; title: string }>) => void;
  ids: string[];
}

export const getDashboardsByIdsAction: ActionDefinition<Context> = {
  id: 'getDashboardsByIdsAction',
  execute: async (context: Context) => {
    const dashboards = await Promise.all(
      context.ids.map(async (id) => {
        try {
          return await dashboardClient.get(id);
        } catch {
          return null;
        }
      })
    );

    context.onResults(
      dashboards
        .filter((dashboard): dashboard is NonNullable<typeof dashboard> => dashboard !== null)
        .map(({ id, data, meta }) => ({
          id,
          isManaged: Boolean(meta.managed),
          title: data.title ?? '',
        }))
    );
  },
};
