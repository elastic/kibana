/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState, memo, useCallback, useMemo } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import type { DataView } from '@kbn/data-views-plugin/public';
import { redirectWhenMissing, SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import {
  AnalyticsNoDataPageKibanaProvider,
  AnalyticsNoDataPage,
} from '@kbn/shared-ux-page-analytics-no-data';
import { getSavedSearchFullPathUrl } from '@kbn/saved-search-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { AssistantOverlay, AssistantProvider, Conversation } from '@kbn/elastic-assistant';
import {
  EuiAvatar,
  EuiButtonIcon,
  EuiCommentProps,
  EuiCopy,
  EuiMarkdownFormat,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { useLocalStorage } from 'react-use/lib';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUrl } from './hooks/use_url';
import { useSingleton } from './hooks/use_singleton';
import { MainHistoryLocationState } from '../../../common/locator';
import { DiscoverStateContainer, getDiscoverStateContainer } from './services/discover_state';
import { DiscoverMainApp } from './discover_main_app';
import { getRootBreadcrumbs, getSavedSearchBreadcrumbs } from '../../utils/breadcrumbs';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { DiscoverError } from '../../components/common/error_alert';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { getScopedHistory, getUrlTracker } from '../../kibana_services';
import { useAlertResultsToast } from './hooks/use_alert_results_toast';
import { DiscoverMainProvider } from './services/discover_state_provider';
import { APP_ICON, PLUGIN_ID } from '../../../common';
import {
  BASE_DISCOVER_CONVERSATIONS,
  BASE_DISCOVER_QUICK_PROMPTS,
  BASE_SYSTEM_PROMPTS,
} from './assistant/conversations';
import { ELASTIC_DISCOVER_ASSISTANT } from './assistant/translations';

const DiscoverMainAppMemoized = memo(DiscoverMainApp);

interface DiscoverLandingParams {
  id: string;
}

interface Props {
  isDev: boolean;
}

export function DiscoverMainRoute(props: Props) {
  const history = useHistory();
  const services = useDiscoverServices();
  const { isDev } = props;
  const {
    core,
    chrome,
    data,
    toastNotifications,
    http: { basePath },
    http,
    dataViewEditor,
    triggersActionsUi: { actionTypeRegistry },
  } = services;
  const { id: savedSearchId } = useParams<DiscoverLandingParams>();
  const stateContainer = useSingleton<DiscoverStateContainer>(() =>
    getDiscoverStateContainer({
      history,
      services,
    })
  );
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [hasESData, setHasESData] = useState(false);
  const [hasUserDataView, setHasUserDataView] = useState(false);
  const [showNoDataPage, setShowNoDataPage] = useState<boolean>(false);
  const hasCustomBranding = useObservable(core.customBranding.hasCustomBranding$, false);

  /**
   * Elastic Assistant Discover Integration
   */
  // UseQuery client used by 'actions' hooks in Elastic Assistant
  const queryClient = new QueryClient();

  // Local storage for saving Discover Conversations
  const [localStorageConversations, setLocalStorageConversations] = useLocalStorage(
    `${PLUGIN_ID}.discoverAssistant`,
    BASE_DISCOVER_CONVERSATIONS
  );

  const getInitialConversation = useCallback(() => {
    return localStorageConversations ?? {};
  }, [localStorageConversations]);

  // Solution Specific Comment Rendering
  const getComments = useCallback(
    ({
      currentConversation,
      lastCommentRef,
    }: {
      currentConversation: Conversation;
      lastCommentRef: React.MutableRefObject<HTMLDivElement | null>;
    }): EuiCommentProps[] =>
      currentConversation.messages.map((message, index) => {
        const isUser = message.role === 'user';

        return {
          actions: (
            <EuiToolTip position="top" content={'Copy'}>
              <EuiCopy textToCopy={message.content}>
                {(copy) => (
                  <EuiButtonIcon
                    aria-label={'Copy'}
                    color="primary"
                    iconType="copyClipboard"
                    onClick={copy}
                  />
                )}
              </EuiCopy>
            </EuiToolTip>
          ),
          children:
            index !== currentConversation.messages.length - 1 ? (
              <EuiText>
                <EuiMarkdownFormat className={`message-${index}`}>
                  {message.content}
                </EuiMarkdownFormat>
              </EuiText>
            ) : (
              <EuiText>
                <EuiMarkdownFormat className={`message-${index}`}>
                  {message.content}
                </EuiMarkdownFormat>
                <span ref={lastCommentRef} />
              </EuiText>
            ),
          timelineAvatar: isUser ? (
            <EuiAvatar name="user" size="l" color="subdued" iconType="userAvatar" />
          ) : (
            <EuiAvatar name="machine" size="l" color="subdued" iconType={APP_ICON} />
          ),
          timestamp: `at ${message.timestamp}`,
          username: isUser ? 'You' : 'Assistant',
        };
      }),
    []
  );

  /**
   * Get location state of scoped history only on initial load
   */
  const historyLocationState = useMemo(
    () => getScopedHistory().location.state as MainHistoryLocationState | undefined,
    []
  );

  useAlertResultsToast({
    isAlertResults: historyLocationState?.isAlertResults,
    toastNotifications,
  });

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'app',
    id: savedSearchId || 'new',
  });

  const checkData = useCallback(async () => {
    try {
      const hasUserDataViewValue = await data.dataViews.hasData
        .hasUserDataView()
        .catch(() => false);
      const hasESDataValue = isDev || (await data.dataViews.hasData.hasESData().catch(() => false));
      setHasUserDataView(hasUserDataViewValue);
      setHasESData(hasESDataValue);

      if (!hasUserDataViewValue) {
        setShowNoDataPage(true);
        return false;
      }

      let defaultDataView: DataView | null = null;
      try {
        defaultDataView = await data.dataViews.getDefaultDataView({ displayErrors: false });
      } catch (e) {
        //
      }

      if (!defaultDataView) {
        setShowNoDataPage(true);
        return false;
      }
      return true;
    } catch (e) {
      setError(e);
      return false;
    }
  }, [data.dataViews, isDev]);

  const loadSavedSearch = useCallback(
    async (nextDataView?: DataView) => {
      setLoading(true);
      if (!nextDataView && !(await checkData())) {
        setLoading(false);
        return;
      }
      try {
        await stateContainer.actions.loadDataViewList();
        // reset appState in case a saved search with id is loaded and the url is empty
        // so the saved search is loaded in a clean state
        // else it might be updated by the previous app state
        const useAppState = !stateContainer.appState.isEmptyURL();
        const currentSavedSearch = await stateContainer.actions.loadSavedSearch({
          savedSearchId,
          dataView: nextDataView,
          dataViewSpec: historyLocationState?.dataViewSpec,
          useAppState,
        });
        if (currentSavedSearch?.id) {
          chrome.recentlyAccessed.add(
            getSavedSearchFullPathUrl(currentSavedSearch.id),
            currentSavedSearch.title ?? '',
            currentSavedSearch.id
          );
        }

        chrome.setBreadcrumbs(
          currentSavedSearch && currentSavedSearch.title
            ? getSavedSearchBreadcrumbs(currentSavedSearch.title)
            : getRootBreadcrumbs()
        );

        setLoading(false);
      } catch (e) {
        if (e instanceof SavedObjectNotFound) {
          redirectWhenMissing({
            history,
            navigateToApp: core.application.navigateToApp,
            basePath,
            mapping: {
              search: '/',
              'index-pattern': {
                app: 'management',
                path: `kibana/objects/savedSearches/${savedSearchId}`,
              },
            },
            toastNotifications,
            onBeforeRedirect() {
              getUrlTracker().setTrackedUrl('/');
            },
            theme: core.theme,
          })(e);
        } else {
          setError(e);
        }
      }
    },
    [
      checkData,
      stateContainer,
      savedSearchId,
      historyLocationState?.dataViewSpec,
      chrome,
      history,
      core.application.navigateToApp,
      core.theme,
      basePath,
      toastNotifications,
    ]
  );

  const onDataViewCreated = useCallback(
    async (nextDataView: unknown) => {
      if (nextDataView) {
        setLoading(true);
        setShowNoDataPage(false);
        setError(undefined);
        await loadSavedSearch(nextDataView as DataView);
      }
    },
    [loadSavedSearch]
  );

  // primary fetch: on initial search + triggered when id changes
  useEffect(() => {
    // restore the previously selected data view for a new state
    loadSavedSearch(!savedSearchId ? stateContainer.internalState.getState().dataView : undefined);
  }, [loadSavedSearch, savedSearchId, stateContainer]);

  // secondary fetch: in case URL is set to `/`, used to reset to 'new' state, keeping the current data view
  useUrl({
    history,
    savedSearchId,
    onNewUrl: () => {
      // restore the previously selected data view for a new state
      const dataView = stateContainer.internalState.getState().dataView;
      loadSavedSearch(dataView);
    },
  });

  if (showNoDataPage) {
    const analyticsServices = {
      coreStart: core,
      dataViews: {
        ...data.dataViews,
        hasData: {
          ...data.dataViews.hasData,

          // We've already called this, so we can optimize the analytics services to
          // use the already-retrieved data to avoid a double-call.
          hasESData: () => Promise.resolve(isDev ? true : hasESData),
          hasUserDataView: () => Promise.resolve(hasUserDataView),
        },
      },
      dataViewEditor,
    };

    return (
      <AnalyticsNoDataPageKibanaProvider {...analyticsServices}>
        <AnalyticsNoDataPage onDataViewCreated={onDataViewCreated} allowAdHocDataView />
      </AnalyticsNoDataPageKibanaProvider>
    );
  }

  if (error) {
    return <DiscoverError error={error} />;
  }

  if (loading) {
    return <LoadingIndicator type={hasCustomBranding ? 'spinner' : 'elastic'} />;
  }

  return (
    <DiscoverMainProvider value={stateContainer}>
      <QueryClientProvider client={queryClient}>
        <AssistantProvider
          actionTypeRegistry={actionTypeRegistry}
          augmentMessageCodeBlocks={() => []}
          baseQuickPrompts={BASE_DISCOVER_QUICK_PROMPTS}
          baseSystemPrompts={BASE_SYSTEM_PROMPTS}
          getComments={getComments}
          getInitialConversations={getInitialConversation}
          http={http}
          nameSpace={PLUGIN_ID}
          setConversations={setLocalStorageConversations}
          title={ELASTIC_DISCOVER_ASSISTANT}
        >
          <AssistantOverlay />
          <DiscoverMainAppMemoized stateContainer={stateContainer} />
        </AssistantProvider>
      </QueryClientProvider>
    </DiscoverMainProvider>
  );
}
