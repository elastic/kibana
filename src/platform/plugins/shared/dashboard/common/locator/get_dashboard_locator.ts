/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { LocatorDefinition } from '@kbn/share-plugin/public';

import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DashboardLocatorParams } from '../types';

export function getDashboardLocator({
  useHashedUrl,
  getDashboardFilters,
}: {
  useHashedUrl: boolean;
  getDashboardFilters: (dashboardId: string) => Promise<Filter[]>;
}): LocatorDefinition<DashboardLocatorParams> {
  return {
    id: DASHBOARD_APP_LOCATOR,
    getLocation: async (params: DashboardLocatorParams) => {
      const { getLocation } = await import('./get_location');
      return getLocation(params, useHashedUrl, getDashboardFilters);
    },
  };
}
