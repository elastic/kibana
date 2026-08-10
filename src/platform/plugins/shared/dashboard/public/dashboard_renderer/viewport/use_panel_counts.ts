/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState } from 'react';
import { apiPublishesIsVisible } from '@kbn/presentation-publishing';
import type { DashboardApi, DashboardInternalApi } from '../../dashboard_api/types';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { useDashboardInternalApi } from '../../dashboard_api/use_dashboard_internal_api';

export interface PanelCounts {
  panelCount: number;
  visiblePanelCount: number;
  sectionCount: number;
}

export function usePanelCounts() {
  const dashboardApi = useDashboardApi();
  const dashboardInternalApi = useDashboardInternalApi();

  const [panelCounts, setPanelCounts] = useState<PanelCounts>(() =>
    getPanelCounts(dashboardApi, dashboardInternalApi)
  );

  return panelCounts;
}

function getPanelCounts(dashboardApi: DashboardApi, dashboardInternalApi: DashboardInternalApi) {
  const layout = dashboardApi.layout$.value;
  const panels = Object.values(layout.panels);
  const uncollapsedPanels = panels.filter(({ grid }) => {
    return !dashboardInternalApi.isSectionCollapsed(grid.sectionId);
  });
  const panelsInViewport = Object.values(dashboardApi.children$.value).filter(
    (api) => apiPublishesIsVisible(api) && api.isVisible$.value
  );
  return {
    panelCount: panels.length,
    visiblePanelCount:
      dashboardApi.fetchSetting$.value === 'all'
        ? uncollapsedPanels.length
        : panelsInViewport.length,
    sectionCount: Object.keys(layout.sections).length,
  };
}
