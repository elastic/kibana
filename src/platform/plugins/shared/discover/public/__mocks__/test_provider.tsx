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
  RuntimeStateManagerProvider,
  CurrentTabProvider,
  selectTabRuntimeState,
  useRuntimeState,
} from '../application/main/state_management/redux';
import {
  DiscoverCustomizationProvider,
  type DiscoverCustomizationService,
} from '../customizations';
import { DiscoverMainProvider } from '../application/main/state_management/discover_state_provider';
import { type ScopedProfilesManager } from '../context_awareness';
import type { DiscoverServices } from '../build_services';
import { createDiscoverServicesMock } from './services';
import type { TestDiscoverStateContainer } from './discover_state.mock';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { ChartPortalsRenderer } from '../application/main/components/chart';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ScopedDiscoverEBTManager } from '../ebt_manager';
import { ScopedServicesProvider } from '../components/scoped_services_provider';
import { type InternalStateMockToolkit } from './discover_state.mock';
import { from } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';

/**
 * Similar to {@link DiscoverTestProvider} but accepts an {@link InternalStateMockToolkit}
 * returned by `getDiscoverInternalStateMock`, which is generally preferred for component tests.
 */
export const DiscoverToolkitTestProvider = ({
  toolkit,
  ...props
}: Pick<DiscoverTestProviderProps, 'usePortalsRenderer' | 'children'> & {
  toolkit: InternalStateMockToolkit;
}) => {
  const [internalState$] = useState(() => from(toolkit.internalState));
  const internalState = useObservable(internalState$, toolkit.internalState.getState());
  const currentTabId = internalState.tabs.unsafeCurrentId;
  const currentTabRuntimeState = selectTabRuntimeState(toolkit.runtimeStateManager, currentTabId);
  const customizationService = useRuntimeState(currentTabRuntimeState.customizationService$);
  const adHocDataViews = useRuntimeState(toolkit.runtimeStateManager.adHocDataViews$);
  const currentDataView = useRuntimeState(currentTabRuntimeState.currentDataView$);
  const runtimeState = useMemo<CombinedRuntimeState | undefined>(
    () => (currentDataView ? { adHocDataViews, currentDataView } : undefined),
    [adHocDataViews, currentDataView]
  );
  const scopedProfilesManager = useRuntimeState(currentTabRuntimeState.scopedProfilesManager$);
  const scopedEbtManager = useRuntimeState(currentTabRuntimeState.scopedEbtManager$);

  return (
    <DiscoverTestProviderInternal
      services={toolkit.services}
      internalState={toolkit.internalState}
      runtimeStateManager={toolkit.runtimeStateManager}
      customizationService={customizationService}
      scopedProfilesManager={scopedProfilesManager}
      scopedEbtManager={scopedEbtManager}
      runtimeState={runtimeState}
      currentTabId={currentTabId}
      {...props}
    />
  );
};

export type DiscoverTestProviderProps = PropsWithChildren<{
  services?: DiscoverServices;
  /**
   * @deprecated Use `DiscoverToolkitTestProvider` with the toolkit from `getDiscoverInternalStateMock()` instead.
   * The stateContainer is only needed for the customization framework context (DiscoverMainProvider).
   */
  stateContainer?: TestDiscoverStateContainer;
  customizationService?: DiscoverCustomizationService;
  scopedProfilesManager?: ScopedProfilesManager;
  scopedEbtManager?: ScopedDiscoverEBTManager;
  runtimeState?: CombinedRuntimeState;
  currentTabId?: string;
  usePortalsRenderer?: boolean;
}>;

/**
 * **Prefer {@link DiscoverToolkitTestProvider} when possible.**
 * Can be used to wrap Discover components in tests
 * to provide all necessary context providers and state.
 */
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
}: DiscoverTestProviderProps) => {
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
      <RuntimeStateManagerProvider value={stateContainer.runtimeStateManager}>
        <InternalStateProvider store={stateContainer.internalState}>
          {children}
        </InternalStateProvider>
      </RuntimeStateManagerProvider>
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

type DiscoverTestProviderInternalProps = PropsWithChildren<{
  services?: DiscoverServices;
  internalState: InternalStateMockToolkit['internalState'];
  runtimeStateManager: InternalStateMockToolkit['runtimeStateManager'];
  customizationService?: DiscoverCustomizationService;
  scopedProfilesManager?: ScopedProfilesManager;
  scopedEbtManager?: ScopedDiscoverEBTManager;
  runtimeState?: CombinedRuntimeState;
  currentTabId?: string;
  usePortalsRenderer?: boolean;
}>;

const DiscoverTestProviderInternal = ({
  services: originalServices,
  internalState,
  runtimeStateManager,
  customizationService,
  runtimeState,
  scopedProfilesManager: originalScopedProfilesManager,
  scopedEbtManager: originalScopedEbtManager,
  currentTabId,
  usePortalsRenderer,
  children,
}: DiscoverTestProviderInternalProps) => {
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

  if (usePortalsRenderer) {
    children = (
      <ChartPortalsRenderer runtimeStateManager={runtimeStateManager}>
        {children}
      </ChartPortalsRenderer>
    );
  }

  children = (
    <RuntimeStateManagerProvider value={runtimeStateManager}>
      <InternalStateProvider store={internalState}>{children}</InternalStateProvider>
    </RuntimeStateManagerProvider>
  );

  return (
    <KibanaRenderContextProvider {...services.core}>
      <KibanaContextProvider services={services}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};
