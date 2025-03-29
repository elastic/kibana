/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { useParams } from 'react-router-dom';
import useLatest from 'react-use/lib/useLatest';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { useUrl } from '../../hooks/use_url';
import { useAlertResultsToast } from '../../hooks/use_alert_results_toast';
import { createDataViewDataSource } from '../../../../../common/data_sources';
import type { MainHistoryLocationState } from '../../../../../common';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import type { DiscoverAppState } from '../../state_management/discover_app_state_container';
import { getDiscoverStateContainer } from '../../state_management/discover_state';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import {
  RuntimeStateProvider,
  internalStateActions,
  useInternalStateDispatch,
  useInternalStateSelector,
  useRuntimeState,
} from '../../state_management/redux';
import type {
  CustomizationCallback,
  DiscoverCustomizationContext,
  DiscoverCustomizationService,
} from '../../../../customizations';
import type { InternalStateStore, RuntimeStateManager } from '../../state_management/redux';
import {
  DiscoverCustomizationProvider,
  useDiscoverCustomizationService,
} from '../../../../customizations';
import { DiscoverError } from '../../../../components/common/error_alert';
import { NoDataPage } from './no_data_page';
import { DiscoverMainProvider } from '../../state_management/discover_state_provider';
import { BrandedLoadingIndicator } from './branded_loading_indicator';
import { RedirectWhenSavedObjectNotFound } from './redirect_not_found';
import { DiscoverMainApp } from './main_app';
import { useAsyncFunction } from '../../hooks/use_async_function';
import { DiscoverTopNavInline } from '../top_nav/discover_topnav_inline';

interface DiscoverSessionViewProps {
  customizationContext: DiscoverCustomizationContext;
  customizationCallbacks: CustomizationCallback[];
  urlStateStorage: IKbnUrlStateStorage;
  internalState: InternalStateStore;
  runtimeStateManager: RuntimeStateManager;
}

type SessionInitializationState =
  | {
      showNoDataPage: true;
      stateContainer: undefined;
      customizationService: undefined;
    }
  | {
      showNoDataPage: false;
      stateContainer: DiscoverStateContainer;
      customizationService: DiscoverCustomizationService;
    };

type InitializeSession = (options?: {
  dataViewSpec?: DataViewSpec | undefined;
  defaultUrlState?: DiscoverAppState;
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
  const getCustomizationService = useDiscoverCustomizationService();
  const [initializeSessionState, initializeSession] = useAsyncFunction<InitializeSession>(
    async ({ dataViewSpec, defaultUrlState } = {}) => {
      const stateContainer = getDiscoverStateContainer({
        services,
        customizationContext,
        stateStorageContainer: urlStateStorage,
        internalState,
        runtimeStateManager,
      });
      const customizationService = await getCustomizationService({
        stateContainer,
        customizationCallbacks,
      });
      const { showNoDataPage } = await dispatch(
        internalStateActions.initializeSession({
          stateContainer,
          discoverSessionId,
          dataViewSpec,
          defaultUrlState,
          isLogsExplorer: customizationContext.isLogsExplorer,
        })
      );

      return showNoDataPage
        ? { showNoDataPage }
        : { showNoDataPage, stateContainer, customizationService };
    }
  );
  const initializeSessionWithDefaultLocationState = useLatest(() => {
    const historyLocationState = getScopedHistory<
      MainHistoryLocationState & { defaultState?: DiscoverAppState }
    >()?.location.state;
    initializeSession({
      dataViewSpec: historyLocationState?.dataViewSpec,
      defaultUrlState: historyLocationState?.defaultState,
    });
  });
  const initializationState = useInternalStateSelector((state) => state.initializationState);
  const currentDataView = useRuntimeState(runtimeStateManager.currentDataView$);
  const adHocDataViews = useRuntimeState(runtimeStateManager.adHocDataViews$);

  useEffect(() => {
    initializeSessionWithDefaultLocationState.current();
  }, [discoverSessionId, initializeSessionWithDefaultLocationState]);

  useUrl({
    history,
    savedSearchId: discoverSessionId,
    onNewUrl: () => {
      initializeSessionWithDefaultLocationState.current();
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
            internalStateActions.setInitializationState({ hasESData: true, hasUserDataView: true })
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

  if (!currentDataView) {
    return <BrandedLoadingIndicator />;
  }

  return (
    <DiscoverCustomizationProvider value={initializeSessionState.value.customizationService}>
      <DiscoverMainProvider value={initializeSessionState.value.stateContainer}>
        <RuntimeStateProvider currentDataView={currentDataView} adHocDataViews={adHocDataViews}>
          <DiscoverTopNavInline
            stateContainer={initializeSessionState.value.stateContainer}
            hideNavMenuItems={false}
          />
          <DiscoverMainApp stateContainer={initializeSessionState.value.stateContainer} />
        </RuntimeStateProvider>
      </DiscoverMainProvider>
    </DiscoverCustomizationProvider>
  );
};
