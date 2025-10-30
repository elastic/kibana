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
import { useEffect, useState, useCallback } from 'react';
import React from 'react';
import useUnmount from 'react-use/lib/useUnmount';
import type { AppMountParameters } from '@kbn/core/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import useLatest from 'react-use/lib/useLatest';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { AttachmentType } from '@kbn/onechat-common/attachments';
import { DataSourceType, isDataSourceType } from '../../../common/data_sources';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { CustomizationCallback, DiscoverCustomizationContext } from '../../customizations';
import {
  type DiscoverInternalState,
  InternalStateProvider,
  internalStateActions,
  useInternalStateDispatch,
  useInternalStateSelector,
  selectTabRuntimeState,
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
        ...withNotifyOnErrors(services.core.notifications.toasts),
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
  const { core, dataViews, chrome, data, discoverFeatureFlags } = services;
  const history = useHistory();
  const dispatch = useInternalStateDispatch();
  const rootProfileState = useRootProfile();
  const tabsEnabled = discoverFeatureFlags.getTabsEnabled();

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

  // Create attachments with lazy content loading
  const createAttachments = useCallback((): Array<{
    id: string;
    type: string;
    getContent: () => Promise<Record<string, unknown>> | Record<string, unknown>;
  }> => {
    const attachments: Array<{
      id: string;
      type: string;
      getContent: () => Promise<Record<string, unknown>> | Record<string, unknown>;
    }> = [];

    // Screen context attachment
    attachments.push({
      id: 'discover-screen-context',
      type: AttachmentType.screenContext,
      getContent: async () => {
        const currentTabRuntimeState = selectTabRuntimeState(runtimeStateManager, currentTabId);
        const stateContainer = currentTabRuntimeState?.stateContainer$.getValue();

        if (!stateContainer) {
          return {
            app: 'discover',
            description: 'Discover - Data exploration',
            additional_data: {},
          };
        }

        const appState = stateContainer.appState.getState();
        const savedSearch = stateContainer.savedSearchState.getState();
        const currentTab = stateContainer.getCurrentTab();
        const timeRange = currentTab.globalState.timeRange;
        const isEsqlMode = isDataSourceType(appState.dataSource, DataSourceType.Esql);
        const isSaved = Boolean(savedSearch.id);

        const additionalData: Record<string, string> = {
          isSaved: isSaved ? 'true' : 'false',
          mode: isEsqlMode ? 'esql' : 'normal',
        };

        if (isSaved && savedSearch.id) {
          additionalData.savedSearchId = savedSearch.id;
        }

        if (timeRange) {
          additionalData.timeRange = JSON.stringify({
            from: timeRange.from,
            to: timeRange.to,
          });
        }

        if (isEsqlMode && isOfAggregateQueryType(appState.query)) {
          additionalData.esqlQuery = appState.query.esql;
        }

        if (appState.columns && appState.columns.length > 0) {
          additionalData.selectedFields = JSON.stringify(appState.columns);
        }

        return {
          app: 'discover',
          description: 'Discover - Data exploration',
          url: window.location.href,
          additional_data: additionalData,
        };
      },
    });

    // Text attachment with first 25 documents
    attachments.push({
      id: 'discover-documents',
      type: AttachmentType.text,
      getContent: async () => {
        const currentTabRuntimeState = selectTabRuntimeState(runtimeStateManager, currentTabId);
        const stateContainer = currentTabRuntimeState?.stateContainer$.getValue();

        if (!stateContainer) {
          return { content: '' };
        }

        // Get current documents from the data state
        const documents$ = stateContainer.dataState.data$.documents$;
        const documents = documents$.getValue();

        if (!documents || !documents.result || documents.result.length === 0) {
          return { content: 'No documents available' };
        }

        // Get first 25 documents
        const first25Docs = documents.result.slice(0, 5);
        const content = first25Docs
          .map((doc, index) => {
            const docData = doc.raw._source || {};
            return `Document ${index + 1}:\n${JSON.stringify(docData, null, 2)}\n`;
          })
          .join('\n---\n\n');

        return { content };
      },
    });

    return attachments;
  }, [runtimeStateManager, currentTabId]);

  // Set conversation flyout active config when Discover mounts or when state changes
  useEffect(() => {
    if (services.onechat && currentTabId) {
      const attachments = createAttachments();
      services.onechat.setConversationFlyoutActiveConfig({
        sessionTag: 'discover',
        attachments,
        newConversation: true,
      });
    }
  }, [services.onechat, currentTabId, createAttachments]);

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
        const currentTabRuntimeState = selectTabRuntimeState(runtimeStateManager, currentTabId);
        const currentTabStateContainer = currentTabRuntimeState.stateContainer$.getValue();

        currentTabStateContainer?.appState.updateUrlWithCurrentState();
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

    // Clear conversation flyout active config when Discover unmounts
    if (services.onechat) {
      services.onechat.clearConversationFlyoutActiveConfig();
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
          {tabsEnabled && customizationContext.displayMode !== 'embedded' ? (
            <TabsView {...props} />
          ) : (
            <SingleTabView {...props} />
          )}
        </DiscoverTopNavMenuProvider>
      </ChartPortalsRenderer>
    </rootProfileState.AppWrapper>
  );
};
