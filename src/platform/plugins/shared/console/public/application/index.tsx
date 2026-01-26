/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type {
  HttpSetup,
  NotificationsSetup,
  DocLinksStart,
  ApplicationStart,
} from '@kbn/core/public';

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { RouteComponentProps } from 'react-router-dom';
import { Redirect, useLocation } from 'react-router-dom';
import { Router, Route, Routes } from '@kbn/shared-ux-router';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CONFIG_TAB_ID, HISTORY_TAB_ID, SHELL_TAB_ID } from './containers/main';
import type { AutocompleteInfo } from '../services';
import { createStorage, createHistory, createSettings, setStorage } from '../services';
import { createUsageTracker } from '../services/tracker';
import { loadActiveApi } from '../lib/kb';
import * as localStorageObjectClient from '../lib/local_storage_object_client';
import { Main } from './containers';
import { ServicesContextProvider, EditorContextProvider, RequestContextProvider } from './contexts';
import { createApi, createEsHostService } from './lib';
import type { ConsoleStartServices } from '../types';

const RedirectToShell = () => {
  const location = useLocation();
  return <Redirect to={`/console/shell${location.search}`} />;
};

export interface BootDependencies extends ConsoleStartServices {
  http: HttpSetup;
  docLinkVersion: string;
  notifications: NotificationsSetup;
  usageCollection?: UsageCollectionSetup;
  application: ApplicationStart;
  data: DataPublicPluginStart;
  licensing: LicensingPluginStart;
  element: HTMLElement;
  history: RouteComponentProps['history'];
  docLinks: DocLinksStart['links'];
  autocompleteInfo: AutocompleteInfo;
  isDevMode: boolean;
}

export async function renderApp({
  notifications,
  docLinkVersion,
  usageCollection,
  application,
  data,
  licensing,
  element,
  history,
  http,
  docLinks,
  autocompleteInfo,
  isDevMode,
  ...startServices
}: BootDependencies) {
  const trackUiMetric = createUsageTracker(usageCollection);
  trackUiMetric.load('opened_app');

  await loadActiveApi(http);
  const storage = createStorage({
    engine: window.localStorage,
    prefix: 'sense:',
  });
  setStorage(storage);
  const storageHistory = createHistory({ storage });
  const settings = createSettings({ storage });
  const objectStorageClient = localStorageObjectClient.create(storage);
  const api = createApi({ http });
  const esHostService = createEsHostService({ api });

  autocompleteInfo.mapping.setup(http, settings);

  render(
    <KibanaRenderContextProvider {...startServices}>
      <ServicesContextProvider
        value={{
          ...startServices,
          docLinkVersion,
          docLinks,
          services: {
            esHostService,
            storage,
            history: storageHistory,
            routeHistory: history,
            settings,
            notifications,
            trackUiMetric,
            objectStorageClient,
            http,
            autocompleteInfo,
            application,
            data,
            licensing,
          },
          config: {
            isDevMode,
          },
        }}
      >
        <RequestContextProvider>
          <EditorContextProvider settings={settings.toJSON()}>
            {history ? (
              <Router history={history}>
                <Routes>
                  {[SHELL_TAB_ID, HISTORY_TAB_ID, CONFIG_TAB_ID].map((tab) => (
                    <Route key={tab} path={`/console/${tab}`}>
                      <Main currentTabProp={tab} />
                    </Route>
                  ))}
                  <Route key="redirect" path="/console">
                    <RedirectToShell />
                  </Route>
                </Routes>
              </Router>
            ) : (
              <Main />
            )}
          </EditorContextProvider>
        </RequestContextProvider>
      </ServicesContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => unmountComponentAtNode(element);
}
