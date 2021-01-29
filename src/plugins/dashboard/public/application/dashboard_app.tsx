/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { History } from 'history';
import { merge, Subject, Subscription } from 'rxjs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { debounceTime, tap } from 'rxjs/operators';
import { useKibana } from '../../../kibana_react/public';
import { DashboardConstants } from '../dashboard_constants';
import { DashboardTopNav } from './top_nav/dashboard_top_nav';
import { DashboardAppServices, DashboardEmbedSettings, DashboardRedirect } from './types';
import {
  getChangesFromAppStateForContainerState,
  getDashboardContainerInput,
  getFiltersSubscription,
  getInputSubscription,
  getOutputSubscription,
  getSearchSessionIdFromURL,
} from './dashboard_app_functions';
import {
  useDashboardBreadcrumbs,
  useDashboardContainer,
  useDashboardStateManager,
  useSavedDashboard,
} from './hooks';

import { IndexPattern } from '../services/data';
import { EmbeddableRenderer } from '../services/embeddable';
import { DashboardContainerInput } from '.';
import { leaveConfirmStrings } from '../dashboard_strings';
import { createQueryParamObservable, replaceUrlHashQuery } from '../../../kibana_utils/public';

export interface DashboardAppProps {
  history: History;
  savedDashboardId?: string;
  redirectTo: DashboardRedirect;
  embedSettings?: DashboardEmbedSettings;
}

export function DashboardApp({
  savedDashboardId,
  embedSettings,
  redirectTo,
  history,
}: DashboardAppProps) {
  const {
    data,
    core,
    onAppLeave,
    uiSettings,
    embeddable,
    dashboardCapabilities,
    indexPatterns: indexPatternService,
  } = useKibana<DashboardAppServices>().services;

  const triggerRefresh$ = useMemo(() => new Subject<{ force?: boolean }>(), []);
  const [indexPatterns, setIndexPatterns] = useState<IndexPattern[]>([]);

  const savedDashboard = useSavedDashboard(savedDashboardId, history);
  const { dashboardStateManager, viewMode, setViewMode } = useDashboardStateManager(
    savedDashboard,
    history
  );
  const dashboardContainer = useDashboardContainer(dashboardStateManager, history, false);
  const searchSessionIdQuery$ = useMemo(
    () => createQueryParamObservable(history, DashboardConstants.SEARCH_SESSION_ID),
    [history]
  );

  const refreshDashboardContainer = useCallback(
    (force?: boolean) => {
      if (!dashboardContainer || !dashboardStateManager) {
        return;
      }

      const changes = getChangesFromAppStateForContainerState({
        dashboardContainer,
        appStateDashboardInput: getDashboardContainerInput({
          isEmbeddedExternally: Boolean(embedSettings),
          dashboardStateManager,
          lastReloadRequestTime: force ? Date.now() : undefined,
          dashboardCapabilities,
          query: data.query,
        }),
      });

      if (changes) {
        // state keys change in which likely won't need a data fetch
        const noRefetchKeys: Array<keyof DashboardContainerInput> = [
          'viewMode',
          'title',
          'description',
          'expandedPanelId',
          'useMargins',
          'isEmbeddedExternally',
          'isFullScreenMode',
        ];
        const shouldRefetch = Object.keys(changes).some(
          (changeKey) => !noRefetchKeys.includes(changeKey as keyof DashboardContainerInput)
        );

        const newSearchSessionId: string | undefined = (() => {
          // do not update session id if this is irrelevant state change to prevent excessive searches
          if (!shouldRefetch) return;

          let searchSessionIdFromURL = getSearchSessionIdFromURL(history);
          if (searchSessionIdFromURL) {
            if (
              data.search.session.isRestore() &&
              data.search.session.isCurrentSession(searchSessionIdFromURL)
            ) {
              // navigating away from a restored session
              dashboardStateManager.kbnUrlStateStorage.kbnUrlControls.updateAsync((nextUrl) => {
                if (nextUrl.includes(DashboardConstants.SEARCH_SESSION_ID)) {
                  return replaceUrlHashQuery(nextUrl, (query) => {
                    delete query[DashboardConstants.SEARCH_SESSION_ID];
                    return query;
                  });
                }
                return nextUrl;
              });
              searchSessionIdFromURL = undefined;
            } else {
              data.search.session.restore(searchSessionIdFromURL);
            }
          }

          return searchSessionIdFromURL ?? data.search.session.start();
        })();

        if (changes.viewMode) {
          setViewMode(changes.viewMode);
        }

        dashboardContainer.updateInput({
          ...changes,
          ...(newSearchSessionId && { searchSessionId: newSearchSessionId }),
        });
      }
    },
    [
      history,
      data.query,
      setViewMode,
      embedSettings,
      dashboardContainer,
      data.search.session,
      dashboardCapabilities,
      dashboardStateManager,
    ]
  );

  // Manage dashboard container subscriptions
  useEffect(() => {
    if (!dashboardStateManager || !dashboardContainer) {
      return;
    }
    const timeFilter = data.query.timefilter.timefilter;
    const subscriptions = new Subscription();

    subscriptions.add(
      getInputSubscription({
        dashboardContainer,
        dashboardStateManager,
        filterManager: data.query.filterManager,
      })
    );
    subscriptions.add(
      getOutputSubscription({
        dashboardContainer,
        indexPatterns: indexPatternService,
        onUpdateIndexPatterns: (newIndexPatterns) => setIndexPatterns(newIndexPatterns),
      })
    );
    subscriptions.add(
      getFiltersSubscription({
        query: data.query,
        dashboardStateManager,
      })
    );
    subscriptions.add(
      merge(
        ...[timeFilter.getRefreshIntervalUpdate$(), timeFilter.getTimeUpdate$()]
      ).subscribe(() => triggerRefresh$.next())
    );

    subscriptions.add(
      merge(
        data.search.session.onRefresh$,
        data.query.timefilter.timefilter.getAutoRefreshFetch$(),
        searchSessionIdQuery$
      ).subscribe(() => {
        triggerRefresh$.next({ force: true });
      })
    );

    dashboardStateManager.registerChangeListener(() => {
      // we aren't checking dirty state because there are changes the container needs to know about
      // that won't make the dashboard "dirty" - like a view mode change.
      triggerRefresh$.next();
    });

    // debounce `refreshDashboardContainer()`
    // use `forceRefresh=true` in case at least one debounced trigger asked for it
    let forceRefresh: boolean = false;
    subscriptions.add(
      triggerRefresh$
        .pipe(
          tap((trigger) => {
            forceRefresh = forceRefresh || (trigger?.force ?? false);
          }),
          debounceTime(50)
        )
        .subscribe(() => {
          refreshDashboardContainer(forceRefresh);
          forceRefresh = false;
        })
    );

    return () => {
      subscriptions.unsubscribe();
    };
  }, [
    core.http,
    uiSettings,
    data.query,
    dashboardContainer,
    data.search.session,
    indexPatternService,
    dashboardStateManager,
    searchSessionIdQuery$,
    triggerRefresh$,
    refreshDashboardContainer,
  ]);

  // Sync breadcrumbs when Dashboard State Manager changes
  useDashboardBreadcrumbs(dashboardStateManager, redirectTo);

  // Build onAppLeave when Dashboard State Manager changes
  useEffect(() => {
    if (!dashboardStateManager || !dashboardContainer) {
      return;
    }
    onAppLeave((actions) => {
      if (
        dashboardStateManager?.getIsDirty() &&
        !embeddable.getStateTransfer().isTransferInProgress
      ) {
        return actions.confirm(
          leaveConfirmStrings.getLeaveSubtitle(),
          leaveConfirmStrings.getLeaveTitle()
        );
      }
      return actions.default();
    });
    return () => {
      // reset on app leave handler so leaving from the listing page doesn't trigger a confirmation
      onAppLeave((actions) => actions.default());
    };
  }, [dashboardStateManager, dashboardContainer, onAppLeave, embeddable]);

  return (
    <div className="app-container dshAppContainer">
      {savedDashboard && dashboardStateManager && dashboardContainer && viewMode && (
        <>
          <DashboardTopNav
            {...{
              redirectTo,
              embedSettings,
              indexPatterns,
              savedDashboard,
              dashboardContainer,
              dashboardStateManager,
            }}
            viewMode={viewMode}
            lastDashboardId={savedDashboardId}
            timefilter={data.query.timefilter.timefilter}
            onQuerySubmit={(_payload, isUpdate) => {
              if (isUpdate === false) {
                // The user can still request a reload in the query bar, even if the
                // query is the same, and in that case, we have to explicitly ask for
                // a reload, since no state changes will cause it.
                triggerRefresh$.next({ force: true });
              }
            }}
          />
          <div className="dashboardViewport">
            <EmbeddableRenderer embeddable={dashboardContainer} />
          </div>
        </>
      )}
    </div>
  );
}
