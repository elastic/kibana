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
import type { SidebarComponentType } from '../services';

interface SidebarAppRendererProps<TState> {
  loadComponent: () => Promise<SidebarComponentType<TState>>;
  state: TState;
}

export function SidebarAppRenderer<TState>({
  loadComponent,
  state,
}: SidebarAppRendererProps<TState>) {
  const LazyComponent = useMemo(
    () => lazy(() => loadComponent().then((c) => ({ default: c }))),
    [loadComponent]
  );

  return (
    <Suspense fallback={<Fallback />}>
      <LazyComponent state={state} />
    </Suspense>
  );
}

const Fallback = () => (
  <EuiDelayRender>
    <EuiSkeletonText lines={8} />
  </EuiDelayRender>
);
