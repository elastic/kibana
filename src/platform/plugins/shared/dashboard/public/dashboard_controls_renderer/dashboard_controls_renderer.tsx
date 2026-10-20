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
import { combineLatest, map, of, switchMap } from 'rxjs';
import type { PublishesDataLoading } from '@kbn/presentation-publishing';
import { apiPublishesDataLoading } from '@kbn/presentation-publishing';
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
    const subscription = dashboardApi.layout$.subscribe(({ pinnedPanels }) => {
      setControls({ controls: pinnedPanels });
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [dashboardApi.layout$]);

  const [anyApiUnavailable, setAnyApiUnavailable] = useState(false);
  useEffect(() => {
    const subscription = combineLatest([dashboardApi.layout$, dashboardApi.children$]).subscribe(
      ([layout, children]) => {
        const nextAnyApiUnavailable = Object.keys(layout.pinnedPanels).some(
          (uuid) => !Boolean(children[uuid])
        );
        setAnyApiUnavailable(nextAnyApiUnavailable);
      }
    );
    return () => {
      subscription.unsubscribe();
    };
  }, [dashboardApi]);

  const [anyControlLoading, setAnyControlLoading] = useState(false);
  useEffect(() => {
    const subscription = combineLatest([dashboardApi.layout$, dashboardApi.children$])
      .pipe(
        switchMap(([layout, children]) => {
          const controlsThatPublishDataLoading = Object.keys(layout.pinnedPanels)
            .map((uuid) => children[uuid])
            .filter((api) => apiPublishesDataLoading(api)) as Array<PublishesDataLoading>;
          return controlsThatPublishDataLoading.length === 0
            ? of(false)
            : combineLatest(controlsThatPublishDataLoading.map((child) => child.dataLoading$)).pipe(
                map((values) => values.some((value) => value))
              );
        })
      )
      .subscribe((nextAnyControlLoading) => {
        setAnyControlLoading(nextAnyControlLoading);
      });
    return () => {
      subscription.unsubscribe();
    };
  }, [dashboardApi]);

  return (
    <span data-dashboard-controls-ready={!anyApiUnavailable && !anyControlLoading}>
      <ControlsRenderer
        parentApi={dashboardApi}
        controls={controls} // only controls can currently be pinned
        onControlsChanged={onControlsLayoutChanged}
      />
    </span>
  );
};
