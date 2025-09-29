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
import { createDataViewDataSource } from '../../../../../common/data_sources';
import type { MainHistoryLocationState } from '../../../../../common';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import type { DiscoverAppState } from '../../state_management/discover_app_state_container';
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
import { useAsyncFunction } from '../../hooks/use_async_function';
import { ScopedServicesProvider } from '../../../../components/scoped_services_provider';
import { HideTabsBar } from '../tabs_view/hide_tabs_bar';
import { InitializationError } from './initialization_error';

export interface SingleTabViewProps {
  customizationContext: DiscoverCustomizationContext;
  customizationCallbacks: CustomizationCallback[];
  urlStateStorage: IKbnUrlStateStorage;
  internalState: InternalStateStore;
  runtimeStateManager: RuntimeStateManager;
}

interface SessionInitializationState {
  showNoDataPage: boolean;
}

type InitializeSingleSession = (options?: {
  dataViewSpec?: DataViewSpec | undefined;
  defaultUrlState?: DiscoverAppState;
}) => Promise<SessionInitializationState>;

export const SingleTabView = ({
  customizationContext,
  customizationCallbacks,
  urlStateStorage,
  internalState,
  runtimeStateManager,
}: SingleTabViewProps) => {
  const dispatch = useInternalStateDispatch();
  const services = useDiscoverServices();

  const initializationState = useInternalStateSelector((state) => state.initializationState);
  const currentTabId = useCurrentTabSelector((tab) => tab.id);
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
  const [initializeTabState, initializeTab] = useAsyncFunction<InitializeSingleSession>(
    async ({ dataViewSpec, defaultUrlState } = {}) => {
      const stateContainer = getDiscoverStateContainer({
        tabId: currentTabId,
        services,
        customizationContext,
        stateStorageContainer: urlStateStorage,
        internalState,
        runtimeStateManager,
      });
      const customizationService = await getConnectedCustomizationService({
        stateContainer,
        customizationCallbacks,
      });

      return dispatch(
        initializeSingleTab({
          initializeSingleTabParams: {
            stateContainer,
            customizationService,
            dataViewSpec,
            defaultUrlState,
          },
        })
      );
    },
    currentStateContainer && currentCustomizationService
      ? { loading: false, value: { showNoDataPage: false } }
      : { loading: true }
  );

  useEffect(() => {
    if (!currentStateContainer && !currentCustomizationService) {
      const historyLocationState = services.getScopedHistory<
        MainHistoryLocationState & { defaultState?: DiscoverAppState }
      >()?.location.state;

      initializeTab({
        dataViewSpec: historyLocationState?.dataViewSpec,
        defaultUrlState: historyLocationState?.defaultState,
      });
    }
  }, [currentCustomizationService, currentStateContainer, initializeTab, services]);

  if (initializeTabState.loading) {
    return <BrandedLoadingIndicator />;
  }

  if (initializeTabState.error) {
    return <InitializationError error={initializeTabState.error} />;
  }

  if (initializeTabState.value.showNoDataPage) {
    return (
      <HideTabsBar>
        <NoDataPage
          {...initializationState}
          onDataViewCreated={async (dataViewUnknown) => {
            await dispatch(internalStateActions.loadDataViewList());
            dispatch(
              internalStateActions.setInitializationState({
                hasESData: true,
                hasUserDataView: true,
              })
            );
            const dataView = dataViewUnknown as DataView;
            initializeTab({
              defaultUrlState: dataView.id
                ? { dataSource: createDataViewDataSource({ dataViewId: dataView.id }) }
                : undefined,
            });
          }}
          onESQLNavigationComplete={() => {
            initializeTab();
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
