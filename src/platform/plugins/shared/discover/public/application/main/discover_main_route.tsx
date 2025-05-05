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
import useUnmount from 'react-use/lib/useUnmount';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { CustomizationCallback, DiscoverCustomizationContext } from '../../customizations';
import {
  type DiscoverInternalState,
  InternalStateProvider,
  createInternalStateStore,
  createRuntimeStateManager,
  internalStateActions,
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
import { createTabsStorageManager } from './state_management/tabs_storage_manager';
import { TABS_ENABLED } from '../../constants';
import { ChartPortalsRenderer } from './components/chart';
import type { DiscoverServices } from '../../build_services';

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

  // syncing with the _t part URL
  const [tabsStorageManager] = useState(() =>
    createTabsStorageManager({
      urlStateStorage,
      storage: services.storage,
      enabled: TABS_ENABLED,
    })
  );

  const [runtimeStateManager] = useState(() => createRuntimeStateManager());
  const [internalState] = useState(() =>
    createInternalStateStore({
      services,
      customizationContext,
      runtimeStateManager,
      urlStateStorage,
      tabsStorageManager,
    })
  );

  useEffect(() => {
    const stopUrlSync = tabsStorageManager.startUrlSync({
      // if `_t` in URL changes (for example via browser history), try to restore the previous state
      onChanged: (urlState) => {
        const { tabId: restoreTabId } = urlState;
        // console.log('URL state changed', urlState);
        if (restoreTabId) {
          internalState.dispatch(internalStateActions.restoreTab({ restoreTabId }));
        } else {
          // if tabId is  not present in `_t`, clear all tabs
          internalState.dispatch(internalStateActions.clearAllTabs());
        }
      },
    });
    return () => {
      stopUrlSync();
    };
  }, [tabsStorageManager, internalState]);

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

      const userAndSpaceIds = await getUserIdAndSpaceId(services);

      internalState.dispatch(internalStateActions.initiateTabs(userAndSpaceIds));

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

  useUnmount(() => {
    for (const tabId of Object.keys(runtimeStateManager.tabs.byId)) {
      internalState.dispatch(internalStateActions.disconnectTab({ tabId }));
    }
  });

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
        <ChartPortalsRenderer runtimeStateManager={sessionViewProps.runtimeStateManager}>
          {TABS_ENABLED ? (
            <TabsView {...sessionViewProps} />
          ) : (
            <DiscoverSessionView {...sessionViewProps} />
          )}
        </ChartPortalsRenderer>
      </rootProfileState.AppWrapper>
    </InternalStateProvider>
  );
};

async function getUserIdAndSpaceId(services: DiscoverServices) {
  let userId = '';
  let spaceId = '';

  try {
    userId = (await services.core.security?.authc.getCurrentUser()).profile_uid ?? '';
  } catch {
    // ignore as it's expected for deployments without security enabled
  }

  try {
    spaceId = (await services.spaces?.getActiveSpace())?.id ?? '';
  } catch {
    // ignore
  }

  return { userId, spaceId };
}
