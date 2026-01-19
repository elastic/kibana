/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense, useMemo, useCallback } from 'react';
import { EuiDelayRender, EuiSkeletonText } from '@elastic/eui';
import { useObservable } from '@kbn/use-observable';
import { useSidebarService } from '@kbn/core-chrome-sidebar-context';
import type { SidebarAppId, SidebarComponentType } from '@kbn/core-chrome-sidebar-types';

interface SidebarAppRendererProps {
  appId: SidebarAppId;
  loadComponent: () => Promise<SidebarComponentType<any>>;
}

export function SidebarAppRenderer({ appId, loadComponent }: SidebarAppRendererProps) {
  const sidebarService = useSidebarService();

  const LazyComponent = useMemo(
    () => lazy(() => loadComponent().then((c) => ({ default: c }))),
    [loadComponent]
  );

  const params = useObservable(sidebarService.getParams$(appId), sidebarService.getParams(appId));

  const setParams = useCallback(
    (newParams: Record<string, unknown>) => sidebarService.setParams(appId, newParams),
    [sidebarService, appId]
  );

  return (
    <Suspense fallback={<Fallback />}>
      <LazyComponent params={params} setParams={setParams} />
    </Suspense>
  );
}

const Fallback = () => (
  <EuiDelayRender>
    <EuiSkeletonText lines={8} />
  </EuiDelayRender>
);
