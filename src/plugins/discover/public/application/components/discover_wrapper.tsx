/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { cloneDeep } from 'lodash';
import { DiscoverProps } from './types';
import { Discover } from './discover';
import { DiscoverSearchSessionManager } from '../angular/discover_search_session';

import { SEARCH_FIELDS_FROM_SOURCE, SEARCH_ON_PAGE_LOAD_SETTING } from '../../../common';
import { createSearchSessionRestorationDataProvider, getState } from '../angular/discover_state';
import {
  connectToQueryState,
  esFilters,
  noSearchSessionStorageCapabilityMessage,
  syncQueryStateWithUrl,
} from '../../../../data/public';
import { useFetch } from './use_fetch';
import { setBreadcrumbsTitle } from '../helpers/breadcrumbs';
import { addHelpMenuToAppChrome } from './help_menu/help_menu_util';
import { getStateDefaults } from '../helpers/get_state_defaults';
import { loadIndexPattern } from '../helpers/resolve_index_pattern';

const DiscoverMemoized = React.memo(Discover);

export function DiscoverWrapper(props: DiscoverProps) {
  const [indexPattern, setIndexPattern] = useState(props.indexPattern);
  const { savedSearch, config, services } = props.opts;
  const { capabilities, data, chrome, docLinks } = services;

  const persistentSearchSource = useMemo(() => {
    savedSearch.searchSource.setField('index', indexPattern);
    // searchSource which applies time range
    return savedSearch.searchSource;
  }, [indexPattern, savedSearch.searchSource]);

  const searchSource = useMemo(() => savedSearch.searchSource.createChild(), [
    savedSearch.searchSource,
  ]);

  const history = useMemo(() => services.history(), [services]);

  const useNewFieldsApi = useMemo(() => !services.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [
    services,
  ]);

  /**
   * State logic
   */

  const stateContainer = useMemo(
    () =>
      getState({
        getStateDefaults: () =>
          getStateDefaults({
            config,
            data,
            indexPattern,
            savedSearch,
            searchSource: persistentSearchSource,
          }),
        storeInSessionStorage: config.get('state:storeInSessionStorage'),
        history,
        toasts: services.core.notifications.toasts,
        uiSettings: config,
      }),
    [
      config,
      data,
      history,
      indexPattern,
      persistentSearchSource,
      savedSearch,
      services.core.notifications.toasts,
    ]
  );
  // temporary hack, to be removed
  const { appStateContainer, getPreviousAppState, stopSync } = stateContainer;

  const [state, setState] = useState(stateContainer.appStateContainer.getState());
  useEffect(() => {
    const unsubsribe = stateContainer.appStateContainer.subscribe(async (newState) => {
      // NOTE: this is also called when navigating from discover app to context app
      if (newState.index && state.index !== newState.index) {
        // in case of index pattern switch the route has currently to be reloaded, legacy
        const ip = await loadIndexPattern(newState.index, services.indexPatterns, config);

        if (ip) {
          setIndexPattern(ip.loaded);
        }
      }
      setState(newState);
    });
    return () => unsubsribe();
  }, [config, services.indexPatterns, state.index, stateContainer.appStateContainer]);

  useEffect(() => {
    /**
    if (stateContainer.appStateContainer.getState().index !== indexPattern.id) {
      // used index pattern is different than the given by url/state which is invalid
      stateContainer.setAppState({ index: indexPattern.id });
    }**/
    // sync initial app filters from state to filterManager
    const filters = stateContainer.appStateContainer.getState().filters;
    if (filters) {
      services.filterManager.setAppFilters(cloneDeep(filters));
    }
    const query = stateContainer.appStateContainer.getState().query;
    if (query) {
      data.query.queryString.setQuery(query);
    }

    const stopSyncingQueryAppStateWithStateContainer = connectToQueryState(
      data.query,
      stateContainer.appStateContainer,
      {
        filters: esFilters.FilterStateStore.APP_STATE,
        query: true,
      }
    );

    // syncs `_g` portion of url with query services
    const { stop: stopSyncingGlobalStateWithUrl } = syncQueryStateWithUrl(
      data.query,
      stateContainer.kbnUrlStateStorage
    );
    return () => {
      stopSyncingQueryAppStateWithStateContainer();
      stopSyncingGlobalStateWithUrl();
      stopSync();
    };
  }, [
    appStateContainer,
    config,
    data.query,
    data.search.session,
    getPreviousAppState,
    indexPattern.id,
    props.opts,
    services.filterManager,
    services.indexPatterns,
    stateContainer,
    stopSync,
  ]);

  /**
   * Url / Routing logic
   */
  useEffect(() => {
    // this listener is waiting for such a path http://localhost:5601/app/discover#/
    // which could be set through pressing "New" button in top nav or go to "Discover" plugin from the sidebar
    // to reload the page in a right way
    const unlistenHistoryBasePath = history.listen(({ pathname, search, hash }) => {
      if (!search && !hash && pathname === '/') {
        stateContainer.setAppState(
          getStateDefaults({
            config,
            data,
            indexPattern,
            savedSearch,
            searchSource: persistentSearchSource,
          })
        );
      }
    });
    return () => unlistenHistoryBasePath();
  }, [
    config,
    data,
    history,
    indexPattern,
    persistentSearchSource,
    props.opts,
    savedSearch,
    stateContainer,
  ]);

  /**
   * Search session logic
   */

  const searchSessionManager = useMemo(
    () =>
      new DiscoverSearchSessionManager({
        history,
        session: data.search.session,
      }),
    [data.search.session, history]
  );

  useEffect(() => {
    data.search.session.enableStorage(
      createSearchSessionRestorationDataProvider({
        appStateContainer: stateContainer.appStateContainer,
        data,
        getSavedSearch: () => savedSearch,
      }),
      {
        isDisabled: () =>
          capabilities.discover.storeSearchSession
            ? { disabled: false }
            : {
                disabled: true,
                reasonText: noSearchSessionStorageCapabilityMessage,
              },
      }
    );
  }, [
    capabilities.discover.storeSearchSession,
    data,
    savedSearch,
    stateContainer.appStateContainer,
  ]);

  /**
   * Data fetching logic
   */

  const shouldSearchOnPageLoad = useCallback(() => {
    // A saved search is created on every page load, so we check the ID to see if we're loading a
    // previously saved search or if it is just transient
    return (
      config.get(SEARCH_ON_PAGE_LOAD_SETTING) ||
      savedSearch.id !== undefined ||
      services.timefilter.getRefreshInterval().pause === false ||
      searchSessionManager.hasSearchSessionIdInURL()
    );
  }, [config, savedSearch.id, searchSessionManager, services.timefilter]);

  const useSavedSearch = useFetch({
    indexPattern,
    savedSearch,
    searchSessionManager,
    searchSource,
    services,
    state,
    stateContainer,
    useNewFieldsApi,
    shouldSearchOnPageLoad,
  });

  /**
   * Initializing
   */

  useEffect(() => {
    const pageTitleSuffix = savedSearch.id && savedSearch.title ? `: ${savedSearch.title}` : '';
    chrome.docTitle.change(`Discover${pageTitleSuffix}`);

    setBreadcrumbsTitle(savedSearch, chrome);
    addHelpMenuToAppChrome(chrome, docLinks);
    // Propagate current app state to url, then start syncing and fetching
    stateContainer.replaceUrlAppState({}).then(() => {
      stateContainer.startSync();
      if (shouldSearchOnPageLoad()) {
        useSavedSearch.refetch$.next();
      }
    });
  }, [
    savedSearch,
    chrome,
    docLinks,
    useSavedSearch.refetch$,
    services,
    shouldSearchOnPageLoad,
    stateContainer,
  ]);

  return (
    <DiscoverMemoized
      {...props}
      indexPattern={indexPattern}
      state={state}
      stateContainer={stateContainer}
      searchSessionManager={searchSessionManager}
      shouldSearchOnPageLoad={shouldSearchOnPageLoad}
      useSavedSearch={useSavedSearch}
    />
  );
}
