/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { type IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import useLatest from 'react-use/lib/useLatest';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { ProfileStateMap } from '../../../../../common/context_awareness';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import type { DiscoverAppState } from '../../state_management/redux';
import { getDataStateContainer } from '../../state_management/discover_data_state_container';
import {
  RuntimeStateProvider,
  internalStateActions,
  createTabActionInjector,
  selectTab,
  useInternalStateDispatch,
  useRuntimeState,
  useCurrentTabRuntimeState,
  useCurrentTabSelector,
  useCurrentTabAction,
  TabInitializationStatus,
} from '../../state_management/redux';
import type {
  CustomizationCallback,
  DiscoverCustomizationContext,
} from '../../../../customizations';
import type { InternalStateStore, RuntimeStateManager } from '../../state_management/redux';
import {
  DiscoverCustomizationProvider,
  getConnectedCustomizationService,
} from '../../../../customizations';
import { BrandedLoadingIndicator } from './branded_loading_indicator';
import { DiscoverMainApp } from './main_app';
import { ScopedServicesProvider } from '../../../../components/scoped_services_provider';
import { InitializationError } from './initialization_error';
import type { DiscoverSearchSessionManager } from '../../state_management/discover_search_session';

export interface SingleTabViewProps {
  customizationContext: DiscoverCustomizationContext;
  customizationCallbacks: CustomizationCallback[];
  urlStateStorage: IKbnUrlStateStorage;
  internalState: InternalStateStore;
  runtimeStateManager: RuntimeStateManager;
  searchSessionManager: DiscoverSearchSessionManager;
}

export const SingleTabView = ({
  customizationContext,
  customizationCallbacks,
  urlStateStorage,
  internalState,
  runtimeStateManager,
  searchSessionManager,
}: SingleTabViewProps) => {
  const dispatch = useInternalStateDispatch();
  const services = useDiscoverServices();

  const currentTabId = useCurrentTabSelector((tab) => tab.id);
  const currentTabInitializationState = useCurrentTabSelector((tab) => tab.initializationState);
  const currentDataStateContainer = useCurrentTabRuntimeState((tab) => tab.dataStateContainer$);
  const currentCustomizationService = useCurrentTabRuntimeState((tab) => tab.customizationService$);
  const scopedProfilesManager = useCurrentTabRuntimeState((tab) => tab.scopedProfilesManager$);
  const scopedEbtManager = useCurrentTabRuntimeState((tab) => tab.scopedEbtManager$);
  const currentDataView = useCurrentTabRuntimeState((tab) => tab.currentDataView$);
  const adHocDataViews = useRuntimeState(runtimeStateManager.adHocDataViews$);

  const initializeSingleTab = useCurrentTabAction(internalStateActions.initializeSingleTab);
  const initializeTab = useLatest(
    async ({
      dataViewSpec,
      defaultUrlState,
      esqlControls,
      profileState,
    }: {
      dataViewSpec?: DataViewSpec | undefined;
      defaultUrlState?: DiscoverAppState;
      esqlControls?: ControlPanelsState<OptionsListESQLControlState>;
      profileState?: ProfileStateMap;
    } = {}) => {
      const injectCurrentTab = createTabActionInjector(currentTabId);
      const getCurrentTab = () => selectTab(internalState.getState(), currentTabId);
      const customizationService = await getConnectedCustomizationService({
        customizationCallbacks,
        internalState,
        injectCurrentTab,
        getCurrentTab,
        runtimeStateManager,
        stateStorage: urlStateStorage,
        services,
      });

      const dataStateContainer = getDataStateContainer({
        services,
        searchSessionManager,
        internalState,
        runtimeStateManager,
        urlStateStorage,
        injectCurrentTab,
        getCurrentTab,
      });

      dispatch(
        initializeSingleTab({
          initializeSingleTabParams: {
            customizationService,
            dataStateContainer,
            dataViewSpec,
            esqlControls,
            defaultUrlState,
            profileState,
          },
        })
      );
    }
  );

  useEffect(() => {
    if (currentTabInitializationState.initializationStatus === TabInitializationStatus.NotStarted) {
      // The location state is captured by `initializeTabs` before the tab ID is pushed to the URL,
      // which discards it, so it can't be read from the history here
      const initialTabState = services.initialTabStateService.consume();

      initializeTab.current({
        dataViewSpec: initialTabState?.dataViewSpec,
        esqlControls: initialTabState?.esqlControls,
        defaultUrlState: initialTabState?.defaultState,
        profileState: initialTabState?.profileState,
      });
    }
  }, [currentTabInitializationState.initializationStatus, initializeTab, services]);

  if (currentTabInitializationState.initializationStatus === TabInitializationStatus.Error) {
    return <InitializationError error={currentTabInitializationState.error} />;
  }

  if (!currentDataStateContainer || !currentCustomizationService) {
    return <BrandedLoadingIndicator />;
  }

  return (
    <DiscoverCustomizationProvider value={currentCustomizationService}>
      <RuntimeStateProvider currentDataView={currentDataView} adHocDataViews={adHocDataViews}>
        <ScopedServicesProvider
          scopedProfilesManager={scopedProfilesManager}
          scopedEBTManager={scopedEbtManager}
        >
          <DiscoverMainApp />
        </ScopedServicesProvider>
      </RuntimeStateProvider>
    </DiscoverCustomizationProvider>
  );
};
