/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useHistory } from 'react-router-dom';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import { useEffect, useState } from 'react';
import React from 'react';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { CustomizationCallback, DiscoverCustomizationContext } from '../../customizations';
import {
  type DiscoverInternalState,
  InternalStateProvider,
  createInternalStateStore,
  createRuntimeStateManager,
  internalStateActions,
  CurrentTabProvider,
} from './state_management/redux';
import type { RootProfileState } from '../../context_awareness';
import { useRootProfile, useDefaultAdHocDataViews } from '../../context_awareness';
import { DiscoverError } from '../../components/common/error_alert';
import type { DiscoverSessionViewProps } from './components/session_view';
import {
  BrandedLoadingIndicator,
  DiscoverSessionView,
  NoDataPage,
} from './components/session_view';
import { useAsyncFunction } from './hooks/use_async_function';
import { TabsView } from './components/tabs_view';

// TEMPORARY: This is a temporary flag to enable/disable tabs in Discover until the feature is fully implemented.
const TABS_ENABLED = false;

export interface MainRouteProps {
  customizationContext: DiscoverCustomizationContext;
  customizationCallbacks?: CustomizationCallback[];
  stateStorageContainer?: IKbnUrlStateStorage;
}

type InitializeMainRoute = (
  rootProfileState: Extract<RootProfileState, { rootProfileLoading: false }>
) => Promise<DiscoverInternalState['initializationState']>;

const defaultCustomizationCallbacks: CustomizationCallback[] = [];

export const DiscoverMainRoute = ({
  customizationContext,
  customizationCallbacks = defaultCustomizationCallbacks,
  stateStorageContainer,
}: MainRouteProps) => {
  const services = useDiscoverServices();
  const rootProfileState = useRootProfile();
  const history = useHistory();
  const [urlStateStorage] = useState(
    () =>
      stateStorageContainer ??
      createKbnUrlStateStorage({
        useHash: services.uiSettings.get('state:storeInSessionStorage'),
        history,
        useHashQuery: customizationContext.displayMode !== 'embedded',
        ...withNotifyOnErrors(services.core.notifications.toasts),
      })
  );
  const [runtimeStateManager] = useState(() => createRuntimeStateManager());
  const [internalState] = useState(() =>
    createInternalStateStore({
      services,
      customizationContext,
      runtimeStateManager,
      urlStateStorage,
    })
  );
  const [initialTabId] = useState(() => internalState.getState().tabs.allIds[0]);
  const { initializeProfileDataViews } = useDefaultAdHocDataViews({ internalState });
  const [mainRouteInitializationState, initializeMainRoute] = useAsyncFunction<InitializeMainRoute>(
    async (loadedRootProfileState) => {
      const { dataViews } = services;
      const [hasESData, hasUserDataView, defaultDataViewExists] = await Promise.all([
        dataViews.hasData.hasESData().catch(() => false),
        dataViews.hasData.hasUserDataView().catch(() => false),
        dataViews.defaultDataViewExists().catch(() => false),
        internalState.dispatch(internalStateActions.loadDataViewList()).catch(() => {}),
        initializeProfileDataViews(loadedRootProfileState).catch(() => {}),
      ]);
      const initializationState: DiscoverInternalState['initializationState'] = {
        hasESData,
        hasUserDataView: hasUserDataView && defaultDataViewExists,
      };

      internalState.dispatch(internalStateActions.setInitializationState(initializationState));

      return initializationState;
    }
  );

  useEffect(() => {
    if (!rootProfileState.rootProfileLoading) {
      initializeMainRoute(rootProfileState);
    }
  }, [initializeMainRoute, rootProfileState]);

  if (rootProfileState.rootProfileLoading || mainRouteInitializationState.loading) {
    return <BrandedLoadingIndicator />;
  }

  if (mainRouteInitializationState.error) {
    return <DiscoverError error={mainRouteInitializationState.error} />;
  }

  if (
    !mainRouteInitializationState.value.hasESData &&
    !mainRouteInitializationState.value.hasUserDataView
  ) {
    return (
      <NoDataPage
        {...mainRouteInitializationState.value}
        onDataViewCreated={() => {
          // This is unused if there is no ES data
        }}
      />
    );
  }

  const sessionViewProps: DiscoverSessionViewProps = {
    customizationContext,
    customizationCallbacks,
    urlStateStorage,
    internalState,
    runtimeStateManager,
  };

  return (
    <InternalStateProvider store={internalState}>
      <rootProfileState.AppWrapper>
        {TABS_ENABLED ? (
          <TabsView initialTabId={initialTabId} sessionViewProps={sessionViewProps} />
        ) : (
          <CurrentTabProvider currentTabId={initialTabId}>
            <DiscoverSessionView {...sessionViewProps} />
          </CurrentTabProvider>
        )}
      </rootProfileState.AppWrapper>
    </InternalStateProvider>
  );
};
