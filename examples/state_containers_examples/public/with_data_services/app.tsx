/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { History } from 'history';
import { Router } from 'react-router-dom';

import {
  EuiFieldText,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeader,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { CoreStart } from 'kibana/public';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

import {
  connectToQueryState,
  DataPublicPluginStart,
  esFilters,
  Filter,
  IIndexPattern,
  Query,
  QueryState,
  syncQueryStateWithUrl,
} from '../../../../src/plugins/data/public';
import {
  BaseStateContainer,
  createStateContainer,
  IKbnUrlStateStorage,
  syncState,
  useContainerState,
} from '../../../../src/plugins/kibana_utils/public';
import { ExampleLink, StateContainersExamplesPage } from '../common/example_page';

interface StateDemoAppDeps {
  navigateToApp: CoreStart['application']['navigateToApp'];
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
  history: History;
  kbnUrlStateStorage: IKbnUrlStateStorage;
  exampleLinks: ExampleLink[];
}

interface AppState {
  name: string;
  filters: Filter[];
  query?: Query;
}
const defaultAppState: AppState = {
  name: '',
  filters: [],
};

export const App = ({
  navigation,
  data,
  history,
  kbnUrlStateStorage,
  exampleLinks,
  navigateToApp,
}: StateDemoAppDeps) => {
  const appStateContainer = useMemo(() => createStateContainer(defaultAppState), []);
  const appState = useContainerState(appStateContainer);

  useGlobalStateSyncing(data.query, kbnUrlStateStorage);
  useAppStateSyncing(appStateContainer, data.query, kbnUrlStateStorage);

  const indexPattern = useIndexPattern(data);
  if (!indexPattern)
    return (
      <div>
        No index pattern found. Please create an index pattern before trying this example...
      </div>
    );

  // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
  return (
    <StateContainersExamplesPage navigateToApp={navigateToApp} exampleLinks={exampleLinks}>
      <Router history={history}>
        <>
          <EuiPageBody>
            <EuiPageHeader>
              <EuiTitle size="l">
                <h1>Integration with search bar</h1>
              </EuiTitle>
            </EuiPageHeader>
            <EuiText>
              <p>
                This examples shows how you can use state containers, state syncing utils and
                helpers from data plugin to sync your app state and search bar state with the URL.
              </p>
            </EuiText>

            <navigation.ui.TopNavMenu
              appName={'Example'}
              showSearchBar={true}
              indexPatterns={[indexPattern]}
              useDefaultBehaviors={true}
              showSaveQuery={true}
            />
            <EuiPageContent>
              <EuiText>
                <p>
                  In addition to state from query bar also sync your arbitrary application state:
                </p>
              </EuiText>
              <EuiFieldText
                placeholder="Additional example applications state: My name is..."
                value={appState.name}
                onChange={(e) => appStateContainer.set({ ...appState, name: e.target.value })}
                aria-label="My name"
              />
            </EuiPageContent>
          </EuiPageBody>
        </>
      </Router>
    </StateContainersExamplesPage>
  );
};

function useIndexPattern(data: DataPublicPluginStart) {
  const [indexPattern, setIndexPattern] = useState<IIndexPattern>();
  useEffect(() => {
    const fetchIndexPattern = async () => {
      const defaultIndexPattern = await data.indexPatterns.getDefault();
      if (defaultIndexPattern) {
        setIndexPattern(defaultIndexPattern);
      }
    };
    fetchIndexPattern();
  }, [data.indexPatterns]);

  return indexPattern;
}

function useGlobalStateSyncing(
  query: DataPublicPluginStart['query'],
  kbnUrlStateStorage: IKbnUrlStateStorage
) {
  // setup sync state utils
  useEffect(() => {
    // sync global filters, time filters, refresh interval from data.query to url '_g'
    const { stop } = syncQueryStateWithUrl(query, kbnUrlStateStorage);
    return () => {
      stop();
    };
  }, [query, kbnUrlStateStorage]);
}

// eslint-disable-next-line @typescript-eslint/no-shadow
function useAppStateSyncing<AppState extends QueryState>(
  appStateContainer: BaseStateContainer<AppState>,
  query: DataPublicPluginStart['query'],
  kbnUrlStateStorage: IKbnUrlStateStorage
) {
  // setup sync state utils
  useEffect(() => {
    // sync app filters with app state container from data.query to state container
    const stopSyncingQueryAppStateWithStateContainer = connectToQueryState(
      query,
      appStateContainer,
      { filters: esFilters.FilterStateStore.APP_STATE, query: true }
    );

    // sets up syncing app state container with url
    const { start: startSyncingAppStateWithUrl, stop: stopSyncingAppStateWithUrl } = syncState({
      storageKey: '_a',
      stateStorage: kbnUrlStateStorage,
      stateContainer: {
        ...appStateContainer,
        // stateSync utils requires explicit handling of default state ("null")
        set: (state) => state && appStateContainer.set(state),
      },
    });

    // merge initial state from app state container and current state in url
    const initialAppState: AppState = {
      ...appStateContainer.get(),
      ...kbnUrlStateStorage.get<AppState>('_a'),
    };
    // trigger state update. actually needed in case some data was in url
    appStateContainer.set(initialAppState);

    // set current url to whatever is in app state container
    kbnUrlStateStorage.set<AppState>('_a', initialAppState);

    // finally start syncing state containers with url
    startSyncingAppStateWithUrl();

    return () => {
      stopSyncingQueryAppStateWithStateContainer();
      stopSyncingAppStateWithUrl();
    };
  }, [query, kbnUrlStateStorage, appStateContainer]);
}
