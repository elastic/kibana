/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { useParams } from 'react-router-dom';
import useLatest from 'react-use/lib/useLatest';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import useMount from 'react-use/lib/useMount';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import { useUrl } from '../../hooks/use_url';
import { useAlertResultsToast } from '../../hooks/use_alert_results_toast';
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
import { DiscoverError } from '../../../../components/common/error_alert';
import { NoDataPage } from './no_data_page';
import { DiscoverMainProvider } from '../../state_management/discover_state_provider';
import { BrandedLoadingIndicator } from './branded_loading_indicator';
import { RedirectWhenSavedObjectNotFound } from './redirect_not_found';
import { DiscoverMainApp } from './main_app';
import { useAsyncFunction } from '../../hooks/use_async_function';
import { ScopedServicesProvider } from '../../../../components/scoped_services_provider';

export interface DiscoverSessionViewProps {
  customizationContext: DiscoverCustomizationContext;
  customizationCallbacks: CustomizationCallback[];
  urlStateStorage: IKbnUrlStateStorage;
  internalState: InternalStateStore;
  runtimeStateManager: RuntimeStateManager;
}

interface SessionInitializationState {
  showNoDataPage: boolean;
}

type InitializeSession = (options?: {
  dataViewSpec?: DataViewSpec | undefined;
  defaultUrlState?: DiscoverAppState;
  shouldClearAllTabs?: boolean;
}) => Promise<SessionInitializationState>;

export const DiscoverSessionView = ({
  customizationContext,
  customizationCallbacks,
  urlStateStorage,
  internalState,
  runtimeStateManager,
}: DiscoverSessionViewProps) => {
  const dispatch = useInternalStateDispatch();
  const services = useDiscoverServices();
  const { core, history, getScopedHistory } = services;
  const { id: discoverSessionId } = useParams<{ id?: string }>();
  const currentTabId = useCurrentTabSelector((tab) => tab.id);
  const currentStateContainer = useCurrentTabRuntimeState(
    runtimeStateManager,
    (tab) => tab.stateContainer$
  );
  const currentCustomizationService = useCurrentTabRuntimeState(
    runtimeStateManager,
    (tab) => tab.customizationService$
  );
  const initializeSessionAction = useCurrentTabAction(internalStateActions.initializeSession);
  const [initializeSessionState, initializeSession] = useAsyncFunction<InitializeSession>(
    async ({ dataViewSpec, defaultUrlState, shouldClearAllTabs = false } = {}) => {
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
        initializeSessionAction({
          initializeSessionParams: {
            stateContainer,
            customizationService,
            discoverSessionId,
            dataViewSpec,
            defaultUrlState,
            shouldClearAllTabs,
          },
        })
      );
    },
    currentStateContainer && currentCustomizationService
      ? { loading: false, value: { showNoDataPage: false } }
      : { loading: true }
  );
  const initializeSessionWithDefaultLocationState = useLatest(
    (options?: { shouldClearAllTabs?: boolean }) => {
      const historyLocationState = getScopedHistory<
        MainHistoryLocationState & { defaultState?: DiscoverAppState }
      >()?.location.state;
      initializeSession({
        dataViewSpec: historyLocationState?.dataViewSpec,
        defaultUrlState: historyLocationState?.defaultState,
        shouldClearAllTabs: options?.shouldClearAllTabs,
      });
    }
  );
  const initializationState = useInternalStateSelector((state) => state.initializationState);
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

  useMount(() => {
    if (!currentStateContainer || !currentCustomizationService) {
      initializeSessionWithDefaultLocationState.current();
    }
  });

  useUpdateEffect(() => {
    initializeSessionWithDefaultLocationState.current();
  }, [discoverSessionId, initializeSessionWithDefaultLocationState]);

  useUrl({
    history,
    savedSearchId: discoverSessionId,
    onNewUrl: () => {
      initializeSessionWithDefaultLocationState.current({ shouldClearAllTabs: true });
    },
  });

  useAlertResultsToast();

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'app',
    id: discoverSessionId || 'new',
  });

  if (initializeSessionState.loading) {
    return <BrandedLoadingIndicator />;
  }

  if (initializeSessionState.error) {
    if (initializeSessionState.error instanceof SavedObjectNotFound) {
      return (
        <RedirectWhenSavedObjectNotFound
          error={initializeSessionState.error}
          discoverSessionId={discoverSessionId}
        />
      );
    }

    return <DiscoverError error={initializeSessionState.error} />;
  }

  if (initializeSessionState.value.showNoDataPage) {
    return (
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
          initializeSession({
            defaultUrlState: dataView.id
              ? { dataSource: createDataViewDataSource({ dataViewId: dataView.id }) }
              : undefined,
          });
        }}
        onESQLNavigationComplete={() => {
          initializeSession();
        }}
      />
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
