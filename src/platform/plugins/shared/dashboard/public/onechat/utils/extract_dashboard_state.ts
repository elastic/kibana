/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardApi } from '../../dashboard_api/types';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { Filter, TimeRange } from '@kbn/es-query';

export interface DashboardMetadata {
  name: string;
  id: string | undefined;
  description: string | undefined;
  mode: ViewMode;
  timerange: TimeRange | undefined;
  filters: Filter[];
}

/**
 * Extracts dashboard metadata from the dashboard API
 */
export function extractDashboardMetadata(dashboardApi: DashboardApi): DashboardMetadata {
  const title = dashboardApi.title$.value ?? '';
  const savedObjectId = dashboardApi.savedObjectId$.value;
  const description = dashboardApi.description$.value;
  const viewMode = dashboardApi.viewMode$.value ?? 'view';
  const timeRange = dashboardApi.timeRange$.value;
  const filters = dashboardApi.filters$.value ?? [];

  return {
    name: title,
    id: savedObjectId,
    description,
    mode: viewMode,
    timerange: timeRange,
    filters,
  };
}

