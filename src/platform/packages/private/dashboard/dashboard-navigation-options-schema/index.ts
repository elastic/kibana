/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { DEFAULT_DASHBOARD_NAVIGATION_OPTIONS } from '@kbn/dashboard-navigation-options-common';

export const dashboardNavigationOptionsSchema = z
  .object({
    use_filters: z.boolean().default(DEFAULT_DASHBOARD_NAVIGATION_OPTIONS.use_filters).meta({
      description: 'When enabled, filters are passed to the opening dashboard.',
    }),
    use_time_range: z.boolean().default(DEFAULT_DASHBOARD_NAVIGATION_OPTIONS.use_time_range).meta({
      description: 'When enabled, time range is passed to the opening dashboard.',
    }),
    open_in_new_tab: z
      .boolean()
      .default(DEFAULT_DASHBOARD_NAVIGATION_OPTIONS.open_in_new_tab)
      .meta({
        description: 'When enabled, the dashboard opens in a new browser tab.',
      }),
  })
  .strict()
  .default(DEFAULT_DASHBOARD_NAVIGATION_OPTIONS);

export type DashboardNavigationOptions = z.output<typeof dashboardNavigationOptionsSchema>;
