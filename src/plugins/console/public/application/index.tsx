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
} from 'src/core/public';

import { UsageCollectionSetup } from '../../../usage_collection/public';
import { KibanaThemeProvider } from '../shared_imports';
import { createStorage, createHistory, createSettings } from '../services';
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
}: BootDependencies) {
  const trackUiMetric = createUsageTracker(usageCollection);
  trackUiMetric.load('opened_app');

  const storage = createStorage({
    engine: window.localStorage,
    prefix: 'sense:',
  });
  const history = createHistory({ storage });
  const settings = createSettings({ storage });
  const objectStorageClient = localStorageObjectClient.create(storage);
  const api = createApi({ http });
  const esHostService = createEsHostService({ api });

  render(
    <I18nContext>
      <KibanaThemeProvider theme$={theme$}>
        <ServicesContextProvider
          value={{
            docLinkVersion,
            docLinks,
            services: {
              esHostService,
              storage,
              history,
              settings,
              notifications,
              trackUiMetric,
              objectStorageClient,
              http,
            },
            theme$,
          }}
        >
          <RequestContextProvider>
            <EditorContextProvider settings={settings.toJSON()}>
              <Main />
            </EditorContextProvider>
          </RequestContextProvider>
        </ServicesContextProvider>
      </KibanaThemeProvider>
    </I18nContext>,
    element
  );

  return () => unmountComponentAtNode(element);
}
