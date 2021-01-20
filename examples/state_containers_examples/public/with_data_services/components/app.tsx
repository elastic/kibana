/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useEffect, useRef, useState } from 'react';
import { History } from 'history';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { Router } from 'react-router-dom';

import {
  EuiFieldText,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeader,
  EuiTitle,
} from '@elastic/eui';

import { CoreStart } from '../../../../../src/core/public';
import { NavigationPublicPluginStart } from '../../../../../src/plugins/navigation/public';
import {
  connectToQueryState,
  syncQueryStateWithUrl,
  DataPublicPluginStart,
  IIndexPattern,
  QueryState,
  Filter,
  esFilters,
  Query,
} from '../../../../../src/plugins/data/public';
import {
  BaseState,
  BaseStateContainer,
  createStateContainer,
  createStateContainerReactHelpers,
  IKbnUrlStateStorage,
  ReduxLikeStateContainer,
  syncState,
} from '../../../../../src/plugins/kibana_utils/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../../../common';

interface StateDemoAppDeps {
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
  history: History;
  kbnUrlStateStorage: IKbnUrlStateStorage;
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
const {
  Provider: AppStateContainerProvider,
  useState: useAppState,
  useContainer: useAppStateContainer,
} = createStateContainerReactHelpers<ReduxLikeStateContainer<AppState>>();

const App = ({ navigation, data, history, kbnUrlStateStorage }: StateDemoAppDeps) => {
  const appStateContainer = useAppStateContainer();
  const appState = useAppState();

  useGlobalStateSyncing(data.query, kbnUrlStateStorage);
  useAppStateSyncing(appStateContainer, data.query, kbnUrlStateStorage);

  const indexPattern = useIndexPattern(data);
  if (!indexPattern)
    return <div>No index pattern found. Please create an index patter before loading...</div>;

  // Render the application DOM.
  // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
  return (
    <Router history={history}>
      <I18nProvider>
        <>
          <navigation.ui.TopNavMenu
            appName={PLUGIN_ID}
            showSearchBar={true}
            indexPatterns={[indexPattern]}
            useDefaultBehaviors={true}
            showSaveQuery={true}
          />
          <EuiPage restrictWidth="1000px">
            <EuiPageBody>
              <EuiPageHeader>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="stateDemo.helloWorldText"
                      defaultMessage="{name}!"
                      values={{ name: PLUGIN_NAME }}
                    />
                  </h1>
                </EuiTitle>
              </EuiPageHeader>
              <EuiPageContent>
                <EuiFieldText
                  placeholder="Additional application state: My name is..."
                  value={appState.name}
                  onChange={(e) => appStateContainer.set({ ...appState, name: e.target.value })}
                  aria-label="My name"
                />
              </EuiPageContent>
            </EuiPageBody>
          </EuiPage>
        </>
      </I18nProvider>
    </Router>
  );
};

export const StateDemoApp = (props: StateDemoAppDeps) => {
  const appStateContainer = useCreateStateContainer(defaultAppState);

  return (
    <AppStateContainerProvider value={appStateContainer}>
      <App {...props} />
    </AppStateContainerProvider>
  );
};

function useCreateStateContainer<State extends BaseState>(
  defaultState: State
): ReduxLikeStateContainer<State> {
  const stateContainerRef = useRef<ReduxLikeStateContainer<State> | null>(null);
  if (!stateContainerRef.current) {
    stateContainerRef.current = createStateContainer(defaultState);
  }
  return stateContainerRef.current;
}

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
