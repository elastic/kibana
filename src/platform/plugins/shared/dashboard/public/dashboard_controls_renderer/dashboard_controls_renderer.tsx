/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlsRenderer, type PublishesControlsLayout } from '@kbn/controls-renderer';
import deepEqual from 'fast-deep-equal';
import React, { useMemo, useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import type { DashboardLayout } from '../dashboard_api/layout_manager';
import { arePinnedPanelLayoutsEqual } from '../dashboard_api/layout_manager/are_layouts_equal';
import { useDashboardApi } from '../dashboard_api/use_dashboard_api';

export const DashboardControlsRenderer = () => {
  const dashboardApi = useDashboardApi();
  /**
   * `ControlsRenderer` expects `controls` rather than `pinnedPanels` when rendering its layout; so,
   * we should map this to the expected key and keep them in sync
   */
  const dashboardWithControlsApi = useMemo(() => {
    const controlLayout: PublishesControlsLayout['layout$'] = new BehaviorSubject({
      controls: dashboardApi.layout$.getValue().pinnedPanels, // only controls can be pinned at the moment, so no need to filter
    });
    return { ...dashboardApi, layout$: controlLayout };
  }, [dashboardApi]);

  useEffect(() => {
    const syncControlsWithPinnedPanels = dashboardWithControlsApi.layout$.subscribe(
      ({ controls }) => {
        const currentLayout = dashboardApi.layout$.getValue();
        if (
          !arePinnedPanelLayoutsEqual({ pinnedPanels: controls } as DashboardLayout, currentLayout)
        ) {
          dashboardApi.layout$.next({ ...currentLayout, pinnedPanels: controls });
        }
      }
    );
    const syncPinnedPanelsWithControls = dashboardApi.layout$.subscribe((layout) => {
      const { controls: currentControls } = dashboardWithControlsApi.layout$.getValue();
      if (!deepEqual(currentControls, layout.pinnedPanels)) {
        dashboardWithControlsApi.layout$.next({
          controls: layout.pinnedPanels,
        });
      }
    });
    return () => {
      syncControlsWithPinnedPanels.unsubscribe();
      syncPinnedPanelsWithControls.unsubscribe();
    };
  }, [dashboardWithControlsApi, dashboardApi.layout$]);

  return <ControlsRenderer parentApi={dashboardWithControlsApi} />;
};
