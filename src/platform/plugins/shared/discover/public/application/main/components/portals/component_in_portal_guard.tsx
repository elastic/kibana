/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef } from 'react';
import { DiscoverCustomizationProvider } from '../../../../customizations';
import {
  useInternalStateSelector,
  type RuntimeStateManager,
  selectTabRuntimeState,
  useRuntimeState,
  CurrentTabProvider,
  RuntimeStateProvider,
} from '../../state_management/redux';
import { DiscoverMainProvider } from '../../state_management/discover_state_provider';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { ScopedProfilesManagerProvider } from '../../../../context_awareness';

interface CommonProps {
  stateContainer: DiscoverStateContainer;
}

interface ComponentInPortalGuardProps<ComponentProps> {
  tabId: string;
  runtimeStateManager: RuntimeStateManager;
  componentProps?: ComponentProps;
  Component: React.FC<ComponentProps & CommonProps>;
}

export function ComponentInPortalGuard<ComponentProps>({
  tabId,
  runtimeStateManager,
  componentProps,
  Component,
}: ComponentInPortalGuardProps<ComponentProps>) {
  const isSelected = useInternalStateSelector((state) => state.tabs.unsafeCurrentId === tabId);
  const currentTabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
  const currentScopedProfilesManager = useRuntimeState(
    currentTabRuntimeState.scopedProfilesManager$
  );
  const currentCustomizationService = useRuntimeState(currentTabRuntimeState.customizationService$);
  const currentStateContainer = useRuntimeState(currentTabRuntimeState.stateContainer$);
  const currentDataView = useRuntimeState(currentTabRuntimeState.currentDataView$);
  const adHocDataViews = useRuntimeState(runtimeStateManager.adHocDataViews$);
  const isInitialized = useRef(false);

  if (
    (!isSelected && !isInitialized.current) ||
    !currentCustomizationService ||
    !currentStateContainer ||
    !currentDataView ||
    !currentTabRuntimeState
  ) {
    return null;
  }

  isInitialized.current = true;

  return (
    <CurrentTabProvider currentTabId={tabId}>
      <DiscoverCustomizationProvider value={currentCustomizationService}>
        <DiscoverMainProvider value={currentStateContainer}>
          <RuntimeStateProvider currentDataView={currentDataView} adHocDataViews={adHocDataViews}>
            <ScopedProfilesManagerProvider scopedProfilesManager={currentScopedProfilesManager}>
              <Component
                {...(componentProps as ComponentProps)}
                stateContainer={currentStateContainer}
              />
            </ScopedProfilesManagerProvider>
          </RuntimeStateProvider>
        </DiscoverMainProvider>
      </DiscoverCustomizationProvider>
    </CurrentTabProvider>
  );
}
