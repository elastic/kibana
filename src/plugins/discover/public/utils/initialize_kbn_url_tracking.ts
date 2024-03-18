/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { AppUpdater, CoreSetup, ScopedHistory } from '@kbn/core/public';
import type { BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { createKbnUrlTracker } from '@kbn/kibana-utils-plugin/public';
import { replaceUrlHashQuery } from '@kbn/kibana-utils-plugin/common';
import { isFilterPinned } from '@kbn/es-query';
import { SEARCH_SESSION_ID_QUERY_PARAM } from '../constants';
import type { DiscoverSetupPlugins } from '../plugin';

/**
 * It creates the kbn url tracker for Discover to listens to history changes and optionally to global state
 * changes and updates the nav link url of to point to the last visited page
 */
export function initializeKbnUrlTracking({
  baseUrl,
  core,
  navLinkUpdater$,
  plugins,
  getScopedHistory,
}: {
  baseUrl: string;
  core: CoreSetup;
  navLinkUpdater$: BehaviorSubject<AppUpdater>;
  plugins: DiscoverSetupPlugins;
  getScopedHistory: () => ScopedHistory<unknown>;
}) {
  /**
   * Store the setting of enabling / disabling url
   * it's should be disabled for ad-hoc data views to omit error messages
   * - When you've added an ad hoc data view in Discover
   * - Continued your work in different parts of Kibana
   * - You've closed the Kibana tab
   */
  let urlTrackingEnabled = true;

  const setTrackingEnabled = (value: boolean) => {
    urlTrackingEnabled = value;
  };

  const {
    appMounted,
    appUnMounted,
    stop: stopUrlTracker,
    setActiveUrl: setTrackedUrl,
    restorePreviousUrl,
  } = createKbnUrlTracker({
    // we pass getter here instead of plain `history`,
    // so history is lazily created (when app is mounted)
    // this prevents redundant `#` when not in discover app
    getHistory: getScopedHistory,
    baseUrl,
    defaultSubUrl: '#/',
    storageKey: `lastUrl:${core.http.basePath.get()}:discover`,
    navLinkUpdater$,
    toastNotifications: core.notifications.toasts,
    stateParams: [
      {
        kbnUrlKey: '_g',
        stateUpdate$: plugins.data.query.state$.pipe(
          filter(
            ({ changes }) => !!(changes.globalFilters || changes.time || changes.refreshInterval)
          ),
          map(({ state }) => ({
            ...state,
            filters: state.filters?.filter(isFilterPinned),
          }))
        ),
      },
    ],
    shouldTrackUrlUpdate: () => {
      return urlTrackingEnabled;
    },
    onBeforeNavLinkSaved: (newNavLink: string) => {
      // Do not save SEARCH_SESSION_ID into nav link, because of possible edge cases
      // that could lead to session restoration failure.
      // see: https://github.com/elastic/kibana/issues/87149
      if (newNavLink.includes(SEARCH_SESSION_ID_QUERY_PARAM)) {
        newNavLink = replaceUrlHashQuery(newNavLink, (query) => {
          delete query[SEARCH_SESSION_ID_QUERY_PARAM];
          return query;
        });
      }

      return newNavLink;
    },
  });

  return {
    appMounted,
    appUnMounted,
    stopUrlTracker,
    setTrackedUrl,
    restorePreviousUrl,
    setTrackingEnabled,
  };
}
