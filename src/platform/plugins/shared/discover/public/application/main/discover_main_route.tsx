/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useHistory, useParams } from 'react-router-dom';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import { useEffect, useState } from 'react';
import React from 'react';
import useUnmount from 'react-use/lib/useUnmount';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { CustomizationCallback, DiscoverCustomizationContext } from '../../customizations';
import {
  type DiscoverInternalState,
  InternalStateProvider,
  internalStateActions,
  useInternalStateDispatch,
  useInternalStateSelector,
} from './state_management/redux';
import type { RootProfileState } from '../../context_awareness';
import { useRootProfile, useDefaultAdHocDataViews } from '../../context_awareness';
import type { SingleTabViewProps } from './components/single_tab_view';
import {
  BrandedLoadingIndicator,
  SingleTabView,
  NoDataPage,
  InitializationError,
} from './components/single_tab_view';
import { useAsyncFunction } from './hooks/use_async_function';
import { TabsView } from './components/tabs_view';
import { TABS_ENABLED } from '../../constants';
import { ChartPortalsRenderer } from './components/chart';
import { useStateManagers } from './state_management/hooks/use_state_managers';
import { useUrl } from './hooks/use_url';
import { useAlertResultsToast } from './hooks/use_alert_results_toast';
import { setBreadcrumbs } from '../../utils/breadcrumbs';

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
  const { internalState, runtimeStateManager } = useStateManagers({
    services,
    urlStateStorage,
    customizationContext,
  });

  return (
    <InternalStateProvider store={internalState}>
      <DiscoverMainRouteContent
        customizationContext={customizationContext}
        customizationCallbacks={customizationCallbacks}
        urlStateStorage={urlStateStorage}
        internalState={internalState}
        runtimeStateManager={runtimeStateManager}
      />
    </InternalStateProvider>
  );
};

const DiscoverMainRouteContent = (props: SingleTabViewProps) => {
  const services = useDiscoverServices();
  const { core, dataViews, chrome } = services;
  const history = useHistory();
  const dispatch = useInternalStateDispatch();
  const rootProfileState = useRootProfile();

  const { initializeProfileDataViews } = useDefaultAdHocDataViews();
  const [mainRouteInitializationState, initializeMainRoute] = useAsyncFunction<InitializeMainRoute>(
    async (loadedRootProfileState) => {
      const [hasESData, hasUserDataView, defaultDataViewExists] = await Promise.all([
        dataViews.hasData.hasESData().catch(() => false),
        dataViews.hasData.hasUserDataView().catch(() => false),
        dataViews.defaultDataViewExists().catch(() => false),
        dispatch(internalStateActions.loadDataViewList()).catch(() => {}),
        initializeProfileDataViews(loadedRootProfileState).catch(() => {}),
      ]);
      const initializationState: DiscoverInternalState['initializationState'] = {
        hasESData,
        hasUserDataView: hasUserDataView && defaultDataViewExists,
      };

      dispatch(internalStateActions.setInitializationState(initializationState));

      return initializationState;
    }
  );

  const { id: currentDiscoverSessionId } = useParams<{ id?: string }>();
  const [tabsInitializationState, initializeTabs] = useAsyncFunction(
    async ({
      discoverSessionId,
      shouldClearAllTabs,
    }: {
      discoverSessionId?: string;
      shouldClearAllTabs?: boolean;
    }) => {
      await dispatch(
        internalStateActions.initializeTabs({ discoverSessionId, shouldClearAllTabs })
      ).unwrap();
    }
  );

  useEffect(() => {
    if (!rootProfileState.rootProfileLoading) {
      initializeMainRoute(rootProfileState);
    }
  }, [initializeMainRoute, rootProfileState]);

  useEffect(() => {
    initializeTabs({ discoverSessionId: currentDiscoverSessionId });
  }, [currentDiscoverSessionId, initializeTabs]);

  useUnmount(() => {
    for (const tabId of Object.keys(props.runtimeStateManager.tabs.byId)) {
      dispatch(internalStateActions.disconnectTab({ tabId }));
    }
  });

  useUrl({
    history,
    savedSearchId: currentDiscoverSessionId,
    onNewUrl: () => {
      initializeTabs({ shouldClearAllTabs: true });
    },
  });

  useAlertResultsToast();

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'app',
    id: currentDiscoverSessionId || 'new',
  });

  const persistedDiscoverSession = useInternalStateSelector(
    (state) => state.persistedDiscoverSession
  );

  useEffect(() => {
    if (props.customizationContext.displayMode === 'standalone') {
      const pageTitleSuffix = persistedDiscoverSession?.title
        ? `: ${persistedDiscoverSession.title}`
        : '';
      chrome.docTitle.change(`Discover${pageTitleSuffix}`);
      setBreadcrumbs({ titleBreadcrumbText: persistedDiscoverSession?.title, services });
    }
  }, [
    chrome.docTitle,
    persistedDiscoverSession?.title,
    props.customizationContext.displayMode,
    services,
  ]);

  const areTabsInitializing = useInternalStateSelector((state) => state.tabs.areInitializing);
  const isLoading =
    rootProfileState.rootProfileLoading ||
    mainRouteInitializationState.loading ||
    areTabsInitializing;

  if (isLoading) {
    return <BrandedLoadingIndicator />;
  }

  const error = mainRouteInitializationState.error || tabsInitializationState.error;

  if (error) {
    return <InitializationError error={error} />;
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
    <rootProfileState.AppWrapper>
      <ChartPortalsRenderer runtimeStateManager={props.runtimeStateManager}>
        {TABS_ENABLED ? <TabsView {...props} /> : <SingleTabView {...props} />}
      </ChartPortalsRenderer>
    </rootProfileState.AppWrapper>
  );
};
