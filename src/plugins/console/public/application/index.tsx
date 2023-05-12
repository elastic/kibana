/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Observable } from 'rxjs';
import {
  HttpSetup,
  NotificationsSetup,
  I18nStart,
  CoreTheme,
  DocLinksStart,
  IUiSettingsClient,
} from '@kbn/core/public';

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { SettingsStart } from '@kbn/core-ui-settings-browser';
import { KibanaThemeProvider } from '../shared_imports';
import {
  createStorage,
  createHistory,
  createSettings,
  AutocompleteInfo,
  setStorage,
} from '../services';
import { createUsageTracker } from '../services/tracker';
import * as localStorageObjectClient from '../lib/local_storage_object_client';
import { Main } from './containers';
import { ServicesContextProvider, EditorContextProvider, RequestContextProvider } from './contexts';
import { createApi, createEsHostService } from './lib';

export interface BootDependencies {
  http: HttpSetup;
  docLinkVersion: string;
  I18nContext: I18nStart['Context'];
  notifications: NotificationsSetup;
  usageCollection?: UsageCollectionSetup;
  element: HTMLElement;
  theme$: Observable<CoreTheme>;
  docLinks: DocLinksStart['links'];
  autocompleteInfo: AutocompleteInfo;
  uiSettings: IUiSettingsClient;
  settings: SettingsStart;
}

export function renderApp({
  I18nContext,
  notifications,
  docLinkVersion,
  usageCollection,
  element,
  http,
  theme$,
  docLinks,
  autocompleteInfo,
  uiSettings,
  settings,
}: BootDependencies) {
  const trackUiMetric = createUsageTracker(usageCollection);
  trackUiMetric.load('opened_app');

  const storage = createStorage({
    engine: window.localStorage,
    prefix: 'sense:',
  });
  setStorage(storage);
  const history = createHistory({ storage });
  const consoleSettings = createSettings({ storage });
  const objectStorageClient = localStorageObjectClient.create(storage);
  const api = createApi({ http });
  const esHostService = createEsHostService({ api });

  autocompleteInfo.mapping.setup(http, consoleSettings);

  render(
    <I18nContext>
      <KibanaContextProvider
        services={{
          uiSettings,
          settings,
        }}
      >
        <KibanaThemeProvider theme$={theme$}>
          <ServicesContextProvider
            value={{
              docLinkVersion,
              docLinks,
              services: {
                esHostService,
                storage,
                history,
                settings: consoleSettings,
                notifications,
                trackUiMetric,
                objectStorageClient,
                http,
                autocompleteInfo,
              },
              theme$,
            }}
          >
            <RequestContextProvider>
              <EditorContextProvider settings={consoleSettings.toJSON()}>
                <Main />
              </EditorContextProvider>
            </RequestContextProvider>
          </ServicesContextProvider>
        </KibanaThemeProvider>
      </KibanaContextProvider>
    </I18nContext>,
    element
  );

  return () => unmountComponentAtNode(element);
}
