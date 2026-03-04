/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlsLayout } from '@kbn/controls-renderer';
import { ControlsRenderer } from '@kbn/controls-renderer';
import React, { useEffect, useCallback, useState } from 'react';
import type { DashboardLayout } from '../dashboard_api/layout_manager';
import { useDashboardApi } from '../dashboard_api/use_dashboard_api';

export const DashboardControlsRenderer = () => {
  const dashboardApi = useDashboardApi();
  const onControlsLayoutChanged = useCallback(
    ({ controls }: ControlsLayout) => {
      dashboardApi.layout$.next({
        ...dashboardApi.layout$.getValue(),
        pinnedPanels: controls,
      });
    },
    [dashboardApi.layout$]
  );

  const [controls, setControls] = useState<{ controls: DashboardLayout['pinnedPanels'] }>({
    controls: dashboardApi.layout$.getValue().pinnedPanels,
  });
  useEffect(() => {
    const controlLayoutChangedSubscription = dashboardApi.layout$.subscribe(({ pinnedPanels }) => {
      setControls({ controls: pinnedPanels });
    });
    return () => {
      controlLayoutChangedSubscription.unsubscribe();
    };
  }, [dashboardApi.layout$]);

  useEffect(() => {
    const controlLayoutChangedSubscription = dashboardApi.layout$.subscribe(({ pinnedPanels }) => {
      setControls({ controls: pinnedPanels });
    });
    return () => {
      controlLayoutChangedSubscription.unsubscribe();
    };
  }, [dashboardApi.layout$]);

  return (
    <ControlsRenderer
      parentApi={dashboardApi}
      controls={controls} // only controls can currently be pinned
      onControlsChanged={onControlsLayoutChanged}
    />
  );
};
