/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useObservable } from '@kbn/use-observable';
import { useSidebarService } from '@kbn/core-chrome-sidebar-context';
import type {
  SidebarApp,
  SidebarAppDefinition,
  SidebarAppId,
  SidebarComponentType,
} from '@kbn/core-chrome-sidebar';
import { SidebarPanel } from './sidebar_panel';
import { SidebarBody } from './sidebar_panel_body';
import { useSidebar } from '../hooks';

/**
 * @internal
 */
export function Sidebar() {
  const { isOpen, currentAppId } = useSidebar();
  const sidebarService = useSidebarService();

  if (!isOpen || !currentAppId || !sidebarService.hasApp(currentAppId)) {
    return null;
  }

  return <SidebarContent key={currentAppId} appId={currentAppId} />;
}

interface SidebarContentProps {
  appId: SidebarAppId;
}

function SidebarContent({ appId }: SidebarContentProps) {
  const sidebarService = useSidebarService();
  const appApi = sidebarService.getApp(appId);
  const appDef = sidebarService.getAppDefinition(appId);

  const status = useObservable(appApi.getStatus$(), appApi.getStatus());
  const isLoading = status === 'pending';
  const loading = <SidebarLoadingSkeleton />;

  return (
    <SidebarPanel>
      <Suspense fallback={loading}>
        {isLoading ? loading : <SidebarLoadedContent appApi={appApi} appDef={appDef} />}
      </Suspense>
    </SidebarPanel>
  );
}

/** Module-level cache: one React.lazy wrapper per loadComponent function. Survives component remounts. */
const lazyComponentCache = new WeakMap<Function, React.LazyExoticComponent<SidebarComponentType>>();

const getLazyComponent = (
  loadComponent: () => Promise<SidebarComponentType>
): React.LazyExoticComponent<SidebarComponentType> => {
  let cached = lazyComponentCache.get(loadComponent);
  if (!cached) {
    cached = lazy(async () => ({ default: await loadComponent() }));
    lazyComponentCache.set(loadComponent, cached);
  }
  return cached;
};

interface SidebarLoadedContentProps {
  appApi: SidebarApp;
  appDef: SidebarAppDefinition;
}

function SidebarLoadedContent({ appApi, appDef }: SidebarLoadedContentProps) {
  const state = useObservable(appApi.getState$(), appApi.getState());
  const hasStore = appDef.store != null;
  const LazyComponent = getLazyComponent(appDef.loadComponent);
  const storeProps = hasStore ? { state, actions: appApi.actions } : {};

  return <LazyComponent onClose={appApi.close} {...storeProps} />;
}

const loadingContentAriaLabel = i18n.translate(
  'core.ui.chrome.sidebar.loadingSidebarPanelAriaLabel',
  {
    defaultMessage: 'side panel',
  }
);

const SidebarLoadingSkeleton = () => (
  <SidebarBody>
    <EuiSkeletonText lines={8} contentAriaLabel={loadingContentAriaLabel} />
  </SidebarBody>
);
