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
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useLatest from 'react-use/lib/useLatest';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { CustomizationCallback, DiscoverCustomizationContext } from '../../customizations';
import {
  InternalStateProvider,
  createInternalStateStore,
  createRuntimeStateManager,
  internalStateActions,
} from './state_management/redux';
import { useRootProfile, useDefaultAdHocDataViews } from '../../context_awareness';
import { DiscoverError } from '../../components/common/error_alert';
import {
  BrandedLoadingIndicator,
  DiscoverSessionView,
  NoDataPage,
} from './components/session_view';
import type { InitializeMainRoute, NarrowAsyncState } from './types';

export interface MainRouteProps {
  customizationContext: DiscoverCustomizationContext;
  customizationCallbacks?: CustomizationCallback[];
  stateStorageContainer?: IKbnUrlStateStorage;
}

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
    createInternalStateStore({ services, runtimeStateManager })
  );
  const { initializeProfileDataViews } = useDefaultAdHocDataViews({ internalState });
  const initialize = useLatest<InitializeMainRoute>(async (loadedRootProfileState) => {
    const { dataViews } = services;
    const [hasESData, hasUserDataView, defaultDataViewExists] = await Promise.all([
      dataViews.hasData.hasESData().catch(() => false),
      dataViews.hasData.hasUserDataView().catch(() => false),
      dataViews.defaultDataViewExists().catch(() => false),
      internalState.dispatch(internalStateActions.loadDataViewList()).catch(() => {}),
      initializeProfileDataViews(loadedRootProfileState).catch(() => {}),
    ]);

    return {
      hasESData,
      hasUserDataView: hasUserDataView && defaultDataViewExists,
    };
  });
  const [initializationState, initializeMainRoute] = useAsyncFn<InitializeMainRoute>(
    (...params) => initialize.current(...params),
    [initialize],
    { loading: true }
  );
  const mainRouteInitializationState = initializationState as NarrowAsyncState<
    typeof initializationState
  >;

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

  return (
    <InternalStateProvider store={internalState}>
      <rootProfileState.AppWrapper>
        <DiscoverSessionView
          mainRouteInitializationState={mainRouteInitializationState.value}
          customizationContext={customizationContext}
          customizationCallbacks={customizationCallbacks}
          urlStateStorage={urlStateStorage}
          internalState={internalState}
          runtimeStateManager={runtimeStateManager}
        />
      </rootProfileState.AppWrapper>
    </InternalStateProvider>
  );
};
