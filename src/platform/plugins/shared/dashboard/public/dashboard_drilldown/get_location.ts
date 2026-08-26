/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractTimeRange, isFilterPinned, type Query } from '@kbn/es-query';
import type { HasParentApi, PublishesUnifiedSearch } from '@kbn/presentation-publishing';
import type { KibanaLocation } from '@kbn/share-plugin/public';
import type { ApplyGlobalFilterActionContext } from '@kbn/unified-search-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DashboardLocatorParams } from '../../common';
import type { DashboardDrilldownState } from '../../server/dashboard_drilldown/types';
import { shareService } from '../services/kibana_services';

export async function getLocation(
  drilldownState: DashboardDrilldownState,
  context: ApplyGlobalFilterActionContext
): Promise<KibanaLocation<DashboardLocatorParams>> {
  const params: DashboardLocatorParams = { dashboardId: drilldownState.dashboard_id };

  if (context.embeddable) {
    const embeddableApi = context.embeddable as Partial<
      PublishesUnifiedSearch & HasParentApi<Partial<PublishesUnifiedSearch>>
    >;
    const query = embeddableApi.parentApi?.query$?.value;
    if (query && drilldownState.use_filters) {
      params.query = query as Query;
    }
    const timeRange = embeddableApi.timeRange$?.value ?? embeddableApi.parentApi?.timeRange$?.value;
    if (timeRange && drilldownState.use_time_range) {
      params.time_range = timeRange;
    }
    const filters = embeddableApi.parentApi?.filters$?.value ?? [];
    params.filters = drilldownState.use_filters
      ? filters
      : filters?.filter((f) => isFilterPinned(f));
  }

  /** Get event params */
  const { restOfFilters: filtersFromEvent, timeRange: timeRangeFromEvent } = extractTimeRange(
    context.filters,
    context.timeFieldName
  );

  if (filtersFromEvent) {
    params.filters = [...(params.filters ?? []), ...filtersFromEvent];
  }

  if (timeRangeFromEvent) {
    params.time_range = timeRangeFromEvent;
  }

  const locator = shareService?.url.locators.get(DASHBOARD_APP_LOCATOR);
  if (!locator) throw new Error('Dashboard locator is required for dashboard drilldown.');
  return locator.getLocation(params);
}
