/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense, useMemo } from 'react';
import { EuiDelayRender, EuiSkeletonText } from '@elastic/eui';
import { useObservable } from '@kbn/use-observable';
import type { SidebarAppId, SidebarComponentType } from '@kbn/core-chrome-sidebar';
import { useSidebarService } from '@kbn/core-chrome-sidebar-context';
import { SidebarBody } from './sidebar_panel_body';

interface SidebarAppRendererProps {
  appId: SidebarAppId;
  loadComponent: () => Promise<SidebarComponentType<any, any>>;
}

export function SidebarAppRenderer({ appId, loadComponent }: SidebarAppRendererProps) {
  const sidebar = useSidebarService();
  const appDefinition = sidebar.getAppDefinition(appId);
  const appApi = sidebar.getApp(appId);
  const hasStore = Boolean(appDefinition.store);

  const state = useObservable(appApi.getState$(), appApi.getState());

  const LazyComponent = useMemo(
    () => lazy(() => loadComponent().then((c) => ({ default: c }))),
    [loadComponent]
  );

  return (
    <Suspense fallback={<Fallback />}>
      <LazyComponent
        onClose={appApi.close}
        {...(hasStore && {
          state,
          actions: appApi.actions,
        })}
      />
    </Suspense>
  );
}

const Fallback = () => (
  <EuiDelayRender>
    <SidebarBody>
      <EuiSkeletonText lines={8} />
    </SidebarBody>
  </EuiDelayRender>
);
