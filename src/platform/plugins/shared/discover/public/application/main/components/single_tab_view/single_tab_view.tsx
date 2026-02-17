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
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import useLatest from 'react-use/lib/useLatest';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import { createDataViewDataSource } from '../../../../../common/data_sources';
import type { MainHistoryLocationState } from '../../../../../common';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import type { DiscoverAppState } from '../../state_management/redux';
import { getDiscoverStateContainer } from '../../state_management/discover_state';
import {
  RuntimeStateProvider,
  internalStateActions,
  useInternalStateDispatch,
  useInternalStateSelector,
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
import { NoDataPage } from './no_data_page';
import { DiscoverMainProvider } from '../../state_management/discover_state_provider';
import { BrandedLoadingIndicator } from './branded_loading_indicator';
import { DiscoverMainApp } from './main_app';
import { ScopedServicesProvider } from '../../../../components/scoped_services_provider';
import { HideTabsBar } from '../tabs_view/hide_tabs_bar';
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

  const appInitializationState = useInternalStateSelector((state) => state.initializationState);
  const currentTabId = useCurrentTabSelector((tab) => tab.id);
  const currentTabInitializationState = useCurrentTabSelector((tab) => tab.initializationState);
  const currentStateContainer = useCurrentTabRuntimeState(
    runtimeStateManager,
    (tab) => tab.stateContainer$
  );
  const currentCustomizationService = useCurrentTabRuntimeState(
    runtimeStateManager,
    (tab) => tab.customizationService$
  );
  const scopedProfilesManager = useCurrentTabRuntimeState(
    runtimeStateManager,
    (tab) => tab.scopedProfilesManager$
  );
  const scopedEbtManager = useCurrentTabRuntimeState(
    runtimeStateManager,
    (tab) => tab.scopedEbtManager$
  );
  const currentDataView = useCurrentTabRuntimeState(
    runtimeStateManager,
    (tab) => tab.currentDataView$
  );
  const adHocDataViews = useRuntimeState(runtimeStateManager.adHocDataViews$);

  const initializeSingleTab = useCurrentTabAction(internalStateActions.initializeSingleTab);
  const initializeTab = useLatest(
    async ({
      dataViewSpec,
      defaultUrlState,
      esqlControls,
    }: {
      dataViewSpec?: DataViewSpec | undefined;
      defaultUrlState?: DiscoverAppState;
      esqlControls?: ControlPanelsState<OptionsListESQLControlState>;
    } = {}) => {
      const stateContainer = getDiscoverStateContainer({
        tabId: currentTabId,
        services,
        customizationContext,
        stateStorageContainer: urlStateStorage,
        internalState,
        runtimeStateManager,
        searchSessionManager,
      });
      const customizationService = await getConnectedCustomizationService({
        stateContainer,
        customizationCallbacks,
        services,
      });

      dispatch(
        initializeSingleTab({
          initializeSingleTabParams: {
            stateContainer,
            customizationService,
            dataViewSpec,
            esqlControls,
            defaultUrlState,
          },
        })
      );
    }
  );

  useEffect(() => {
    if (currentTabInitializationState.initializationStatus === TabInitializationStatus.NotStarted) {
      const historyLocationState = services.getScopedHistory<
        MainHistoryLocationState & { defaultState?: DiscoverAppState }
      >()?.location.state;

      initializeTab.current({
        dataViewSpec: historyLocationState?.dataViewSpec,
        esqlControls: historyLocationState?.esqlControls,
        defaultUrlState: historyLocationState?.defaultState,
      });
    }
  }, [currentTabInitializationState.initializationStatus, initializeTab, services]);

  if (currentTabInitializationState.initializationStatus === TabInitializationStatus.Error) {
    return <InitializationError error={currentTabInitializationState.error} />;
  }

  if (currentTabInitializationState.initializationStatus === TabInitializationStatus.NoData) {
    return (
      <HideTabsBar customizationContext={customizationContext}>
        <NoDataPage
          {...appInitializationState}
          onDataViewCreated={async (dataViewUnknown) => {
            await dispatch(internalStateActions.loadDataViewList());
            dispatch(
              internalStateActions.setInitializationState({
                hasESData: true,
                hasUserDataView: true,
              })
            );
            const dataView = dataViewUnknown as DataView;
            initializeTab.current({
              defaultUrlState: dataView.id
                ? { dataSource: createDataViewDataSource({ dataViewId: dataView.id }) }
                : undefined,
            });
          }}
          onESQLNavigationComplete={() => {
            initializeTab.current();
          }}
        />
      </HideTabsBar>
    );
  }

  if (!currentStateContainer || !currentCustomizationService || !currentDataView) {
    return <BrandedLoadingIndicator />;
  }

  return (
    <DiscoverCustomizationProvider value={currentCustomizationService}>
      <DiscoverMainProvider value={currentStateContainer}>
        <RuntimeStateProvider currentDataView={currentDataView} adHocDataViews={adHocDataViews}>
          <ScopedServicesProvider
            scopedProfilesManager={scopedProfilesManager}
            scopedEBTManager={scopedEbtManager}
          >
            <DiscoverMainApp stateContainer={currentStateContainer} />
          </ScopedServicesProvider>
        </RuntimeStateProvider>
      </DiscoverMainProvider>
    </DiscoverCustomizationProvider>
  );
};
