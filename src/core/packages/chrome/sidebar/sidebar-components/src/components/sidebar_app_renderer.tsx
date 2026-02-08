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
import type { SidebarAppId, SidebarComponentType } from '@kbn/core-chrome-sidebar';
import { SidebarBody } from './sidebar_panel_body';
import { useSidebarApp } from '../hooks';

interface SidebarAppRendererProps {
  appId: SidebarAppId;
  loadComponent: () => Promise<SidebarComponentType<any>>;
}

export function SidebarAppRenderer({ appId, loadComponent }: SidebarAppRendererProps) {
  const appApi = useSidebarApp(appId);

  const LazyComponent = useMemo(
    () => lazy(() => loadComponent().then((c) => ({ default: c }))),
    [loadComponent]
  );

  return (
    <Suspense fallback={<Fallback />}>
      <LazyComponent params={appApi.params} setParams={appApi.setParams} onClose={appApi.close} />
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
