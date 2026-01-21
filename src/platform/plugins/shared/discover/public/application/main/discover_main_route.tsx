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
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { useEffect, useState } from 'react';
import React from 'react';
import useUnmount from 'react-use/lib/useUnmount';
import type { AppMountParameters } from '@kbn/core/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import useLatest from 'react-use/lib/useLatest';
import { i18n } from '@kbn/i18n';
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
import { ChartPortalsRenderer } from './components/chart';
import { useStateManagers } from './state_management/hooks/use_state_managers';
import { useUrl } from './hooks/use_url';
import { useAlertResultsToast } from './hooks/use_alert_results_toast';
import { setBreadcrumbs } from '../../utils/breadcrumbs';
import { useUnsavedChanges } from './state_management/hooks/use_unsaved_changes';
import { DiscoverTopNavMenuProvider } from './components/top_nav/discover_topnav_menu';

export interface MainRouteProps {
  customizationContext: DiscoverCustomizationContext;
  customizationCallbacks?: CustomizationCallback[];
  stateStorageContainer?: IKbnUrlStateStorage;
  onAppLeave?: AppMountParameters['onAppLeave'];
}

type InitializeMainRoute = (
  rootProfileState: Extract<RootProfileState, { rootProfileLoading: false }>
) => Promise<DiscoverInternalState['initializationState']>;

const defaultCustomizationCallbacks: CustomizationCallback[] = [];

export const DiscoverMainRoute = ({
  customizationContext,
  customizationCallbacks = defaultCustomizationCallbacks,
  stateStorageContainer,
  onAppLeave,
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
      })
  );
  const { internalState, runtimeStateManager, searchSessionManager } = useStateManagers({
    services,
    urlStateStorage,
    customizationContext,
  });

  useUnsavedChanges({ internalState, runtimeStateManager, onAppLeave });

  return (
    <InternalStateProvider store={internalState}>
      <DiscoverMainRouteContent
        customizationContext={customizationContext}
        customizationCallbacks={customizationCallbacks}
        urlStateStorage={urlStateStorage}
        internalState={internalState}
        runtimeStateManager={runtimeStateManager}
        searchSessionManager={searchSessionManager}
      />
    </InternalStateProvider>
  );
};

const DiscoverMainRouteContent = (props: SingleTabViewProps) => {
  const { customizationContext, runtimeStateManager } = props;
  const services = useDiscoverServices();
  const { core, dataViews, chrome, data } = services;
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

  const { id: currentDiscoverSessionId } = useParams<{ id?: string }>();
  const persistedDiscoverSession = useInternalStateSelector(
    (state) => state.persistedDiscoverSession
  );
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const initializeDiscoverSession = useLatest(
    ({ nextDiscoverSessionId }: { nextDiscoverSessionId: string | undefined }) => {
      const persistedDiscoverSessionId = persistedDiscoverSession?.id;
      const isSwitchingSession = Boolean(
        persistedDiscoverSessionId && persistedDiscoverSessionId !== nextDiscoverSessionId
      );

      if (!persistedDiscoverSessionId || isSwitchingSession) {
        initializeTabs({
          discoverSessionId: nextDiscoverSessionId,
          shouldClearAllTabs: isSwitchingSession,
        });
      } else {
        dispatch(internalStateActions.pushCurrentTabStateToUrl({ tabId: currentTabId }));
      }
    }
  );

  useEffect(() => {
    if (!rootProfileState.rootProfileLoading) {
      initializeMainRoute(rootProfileState);
    }
  }, [initializeMainRoute, rootProfileState]);

  useEffect(() => {
    initializeDiscoverSession.current({ nextDiscoverSessionId: currentDiscoverSessionId });
  }, [currentDiscoverSessionId, initializeDiscoverSession]);

  useUnmount(() => {
    data.search.session.clear();

    for (const tabId of Object.keys(runtimeStateManager.tabs.byId)) {
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

  useEffect(() => {
    if (customizationContext.displayMode === 'standalone') {
      const pageTitleSuffix = persistedDiscoverSession?.title
        ? `: ${persistedDiscoverSession.title}`
        : '';
      chrome.docTitle.change(`Discover${pageTitleSuffix}`);
      setBreadcrumbs({ titleBreadcrumbText: persistedDiscoverSession?.title, services });
    }
  }, [
    chrome.docTitle,
    persistedDiscoverSession?.title,
    customizationContext.displayMode,
    services,
  ]);

  const areTabsInitializing = useInternalStateSelector((state) => state.tabs.areInitializing);
  const isLoading =
    rootProfileState.rootProfileLoading ||
    mainRouteInitializationState.loading ||
    tabsInitializationState.loading ||
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
      <ChartPortalsRenderer runtimeStateManager={runtimeStateManager}>
        <DiscoverTopNavMenuProvider>
          <>
            <h1 className="euiScreenReaderOnly" data-test-subj="discoverSavedSearchTitle">
              {persistedDiscoverSession?.title
                ? i18n.translate('discover.pageTitleWithSavedSearch', {
                    defaultMessage: 'Discover - {savedSearchTitle}',
                    values: {
                      savedSearchTitle: persistedDiscoverSession.title,
                    },
                  })
                : i18n.translate('discover.pageTitleWithoutSavedSearch', {
                    defaultMessage: 'Discover - Session not yet saved',
                  })}
            </h1>
            {customizationContext.displayMode !== 'embedded' ? (
              <TabsView {...props} />
            ) : (
              <SingleTabView {...props} />
            )}
          </>
        </DiscoverTopNavMenuProvider>
      </ChartPortalsRenderer>
    </rootProfileState.AppWrapper>
  );
};
