/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useEffect, useState } from 'react';
import { History } from 'history';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { Router } from 'react-router-dom';

import {
  EuiFieldText,
  EuiHorizontalRule,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageHeader,
  EuiTitle,
} from '@elastic/eui';

import { CoreStart } from '../../../../../src/core/public';
import { NavigationPublicPluginStart } from '../../../../../src/plugins/navigation/public';
import {
  DataPublicPluginStart,
  esFilters,
  IIndexPattern,
  syncAppFilters,
  syncQuery,
  QueryState,
} from '../../../../../src/plugins/data/public';
import {
  BaseStateContainer,
  createStateContainer,
  createStateContainerReactHelpers,
  IKbnUrlStateStorage,
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
  appFilters: esFilters.Filter[];
}
const defaultAppState: AppState = {
  name: '',
  appFilters: [],
};
const _appStateContainer = createStateContainer<AppState>(defaultAppState);
const {
  Provider: AppStateContainerProvider,
  useState: useAppState,
  useContainer: useAppStateContainer,
} = createStateContainerReactHelpers<typeof _appStateContainer>();

interface GlobalState extends QueryState {
  globalData: string;
}
const defaultGlobalState: GlobalState = {
  globalData: '',
};
const _globalStateContainer = createStateContainer<GlobalState>(defaultGlobalState);
const {
  Provider: GlobalStateContainerProvider,
  useState: useGlobalState,
  useContainer: useGlobalStateContainer,
} = createStateContainerReactHelpers<typeof _globalStateContainer>();

const App = ({
  notifications,
  http,
  navigation,
  data,
  history,
  kbnUrlStateStorage,
}: StateDemoAppDeps) => {
  const appStateContainer = useAppStateContainer();
  const appState = useAppState();

  const globalStateContainer = useGlobalStateContainer();
  const globalState = useGlobalState();

  useStateSyncing(appStateContainer, globalStateContainer, data, kbnUrlStateStorage);

  const indexPattern = useIndexPattern(data);
  if (!indexPattern) return <div>Loading...</div>;

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
                <EuiPageContentHeader>
                  <EuiTitle>
                    <h2>
                      <FormattedMessage
                        id="stateDemo.congratulationsTitle"
                        defaultMessage="Congratulations, you have successfully created your first Kibana Plugin!"
                      />
                    </h2>
                  </EuiTitle>
                </EuiPageContentHeader>
                <EuiFieldText
                  placeholder="My name is"
                  value={appState.name}
                  onChange={e => appStateContainer.set({ ...appState, name: e.target.value })}
                  aria-label="My name"
                />
                <EuiHorizontalRule />
                <EuiFieldText
                  placeholder="My global data"
                  value={globalState.globalData}
                  onChange={e =>
                    globalStateContainer.set({ ...globalState, globalData: e.target.value })
                  }
                  aria-label="My global data"
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
  return (
    <AppStateContainerProvider value={_appStateContainer}>
      <GlobalStateContainerProvider value={_globalStateContainer}>
        <App {...props} />
      </GlobalStateContainerProvider>
    </AppStateContainerProvider>
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

function useStateSyncing<
  AppState extends { appFilters: esFilters.Filter[] },
  GlobalState extends QueryState
>(
  appStateContainer: BaseStateContainer<AppState>,
  globalStateContainer: BaseStateContainer<GlobalState>,
  data: DataPublicPluginStart,
  kbnUrlStateStorage: IKbnUrlStateStorage
) {
  // setup sync state utils
  useEffect(() => {
    // sync global filters, time filters, refresh interval
    const stopSyncingQueryStateWithStateContainer = syncQuery(data.query, globalStateContainer);

    // sync app filters wit app state container
    const stopSyncingAppFiltersWithStateContainer = syncAppFilters(data.query, appStateContainer);

    // sync app state container with url
    const { start: startSyncingAppStateWithUrl, stop: stopSyncingAppStateWithUrl } = syncState({
      storageKey: '_a',
      stateStorage: kbnUrlStateStorage,
      stateContainer: {
        ...appStateContainer,
        set: state => state && appStateContainer.set(state),
      },
    });
    // sync global state container with url
    const {
      start: startSyncingGlobalStateWithUrl,
      stop: stopSyncingGlobalStateWithUrl,
    } = syncState({
      storageKey: '_g',
      stateStorage: kbnUrlStateStorage,
      stateContainer: {
        ...globalStateContainer,
        set: state => state && globalStateContainer.set(state),
      },
    });

    startSyncingAppStateWithUrl();
    startSyncingGlobalStateWithUrl();

    return () => {
      stopSyncingQueryStateWithStateContainer();
      stopSyncingAppFiltersWithStateContainer();
      stopSyncingAppStateWithUrl();
      stopSyncingGlobalStateWithUrl();
    };
  }, [data.query, kbnUrlStateStorage, appStateContainer, globalStateContainer]);
}
