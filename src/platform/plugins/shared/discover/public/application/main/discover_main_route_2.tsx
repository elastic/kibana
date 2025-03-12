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
import type { InitializeMain, NarrowAsyncState } from './types';

export interface MainRoute2Props {
  customizationContext: DiscoverCustomizationContext;
  customizationCallbacks?: CustomizationCallback[];
  stateStorageContainer?: IKbnUrlStateStorage;
}

const defaultCustomizationCallbacks: CustomizationCallback[] = [];

export const DiscoverMainRoute2 = ({
  customizationContext,
  customizationCallbacks = defaultCustomizationCallbacks,
  stateStorageContainer,
}: MainRoute2Props) => {
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
  const initialize = useLatest<InitializeMain>(async (loadedRootProfileState) => {
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
  const [initializationState, initializeMain] = useAsyncFn<InitializeMain>(
    (...params) => initialize.current(...params),
    [initialize],
    { loading: true }
  );
  const mainInitializationState = initializationState as NarrowAsyncState<
    typeof initializationState
  >;

  useEffect(() => {
    if (!rootProfileState.rootProfileLoading) {
      initializeMain(rootProfileState);
    }
  }, [initializeMain, rootProfileState]);

  if (rootProfileState.rootProfileLoading || mainInitializationState.loading) {
    return <BrandedLoadingIndicator />;
  }

  if (mainInitializationState.error) {
    return <DiscoverError error={mainInitializationState.error} />;
  }

  if (!mainInitializationState.value.hasESData && !mainInitializationState.value.hasUserDataView) {
    return (
      <NoDataPage
        {...mainInitializationState.value}
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
          rootProfileState={rootProfileState}
          mainInitializationState={mainInitializationState.value}
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
