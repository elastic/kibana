/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React, { type PropsWithChildren, useMemo, useState } from 'react';
import {
  type CombinedRuntimeState,
  InternalStateProvider,
  RuntimeStateProvider,
  CurrentTabProvider,
} from '../application/main/state_management/redux';
import {
  DiscoverCustomizationProvider,
  type DiscoverCustomizationService,
} from '../customizations';
import { DiscoverMainProvider } from '../application/main/state_management/discover_state_provider';
import { type ScopedProfilesManager } from '../context_awareness';
import type { DiscoverServices } from '../build_services';
import { createDiscoverServicesMock } from './services';
import type { DiscoverStateContainer } from '../application/main/state_management/discover_state';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { ChartPortalsRenderer } from '../application/main/components/chart';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ScopedDiscoverEBTManager } from '../ebt_manager';
import { ScopedServicesProvider } from '../components/scoped_services_provider';

export const DiscoverTestProvider = ({
  services: originalServices,
  stateContainer,
  customizationService,
  runtimeState,
  scopedProfilesManager: originalScopedProfilesManager,
  scopedEbtManager: originalScopedEbtManager,
  currentTabId: originalCurrentTabId,
  usePortalsRenderer,
  children,
}: PropsWithChildren<{
  services?: DiscoverServices;
  stateContainer?: DiscoverStateContainer;
  customizationService?: DiscoverCustomizationService;
  scopedProfilesManager?: ScopedProfilesManager;
  scopedEbtManager?: ScopedDiscoverEBTManager;
  runtimeState?: CombinedRuntimeState;
  currentTabId?: string;
  usePortalsRenderer?: boolean;
}>) => {
  const [queryClient] = useState(() => new QueryClient());
  const services = useMemo(
    () => originalServices ?? createDiscoverServicesMock(),
    [originalServices]
  );
  const scopedEbtManager = useMemo(
    () => originalScopedEbtManager ?? services.ebtManager.createScopedEBTManager(),
    [originalScopedEbtManager, services.ebtManager]
  );
  const scopedProfilesManager = useMemo(
    () =>
      originalScopedProfilesManager ??
      services.profilesManager.createScopedProfilesManager({ scopedEbtManager }),
    [originalScopedProfilesManager, scopedEbtManager, services.profilesManager]
  );
  const currentTabId = originalCurrentTabId ?? stateContainer?.getCurrentTab().id;

  children = (
    <ScopedServicesProvider
      scopedProfilesManager={scopedProfilesManager}
      scopedEBTManager={scopedEbtManager}
    >
      {children}
    </ScopedServicesProvider>
  );

  if (runtimeState) {
    children = <RuntimeStateProvider {...runtimeState}>{children}</RuntimeStateProvider>;
  }

  if (stateContainer) {
    children = <DiscoverMainProvider value={stateContainer}>{children}</DiscoverMainProvider>;
  }

  if (currentTabId && !usePortalsRenderer) {
    children = <CurrentTabProvider currentTabId={currentTabId}>{children}</CurrentTabProvider>;
  }

  if (customizationService) {
    children = (
      <DiscoverCustomizationProvider value={customizationService}>
        {children}
      </DiscoverCustomizationProvider>
    );
  }

  if (stateContainer && usePortalsRenderer) {
    children = (
      <ChartPortalsRenderer runtimeStateManager={stateContainer.runtimeStateManager}>
        {children}
      </ChartPortalsRenderer>
    );
  }

  if (stateContainer) {
    children = (
      <InternalStateProvider store={stateContainer.internalState}>{children}</InternalStateProvider>
    );
  }

  return (
    <KibanaRenderContextProvider {...services.core}>
      <KibanaContextProvider services={services}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};
