/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DocLinksStart, HttpSetup, NotificationsSetup } from '@kbn/core/public';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { loadActiveApi } from '../lib/kb';
import * as localStorageObjectClient from '../lib/local_storage_object_client';
import {
  AutocompleteInfo,
  createHistory,
  createSettings,
  createStorage,
  setStorage,
} from '../services';
import { createUsageTracker } from '../services/tracker';
import { ConsoleStartServices } from '../types';
import { Main } from './containers';
import { EditorContextProvider, RequestContextProvider, ServicesContextProvider } from './contexts';
import { createApi, createEsHostService } from './lib';

export interface BootDependencies {
  http: HttpSetup;
  docLinkVersion: string;
  notifications: NotificationsSetup;
  usageCollection?: UsageCollectionSetup;
  element: HTMLElement;
  docLinks: DocLinksStart['links'];
  autocompleteInfo: AutocompleteInfo;
  isMonacoEnabled: boolean;
  startServices: ConsoleStartServices;
}

export async function renderApp({
  notifications,
  docLinkVersion,
  usageCollection,
  element,
  http,
  docLinks,
  autocompleteInfo,
  isMonacoEnabled,
  startServices,
}: BootDependencies) {
  const trackUiMetric = createUsageTracker(usageCollection);
  trackUiMetric.load('opened_app');

  await loadActiveApi(http);
  const storage = createStorage({
    engine: window.localStorage,
    prefix: 'sense:',
  });
  setStorage(storage);
  const history = createHistory({ storage });
  const settings = createSettings({ storage });
  const objectStorageClient = localStorageObjectClient.create(storage);
  const api = createApi({ http });
  const esHostService = createEsHostService({ api });

  autocompleteInfo.mapping.setup(http, settings);

  render(
    <KibanaRenderContextProvider {...startServices}>
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
            autocompleteInfo,
          },
          config: {
            isMonacoEnabled,
          },
          startServices,
        }}
      >
        <RequestContextProvider>
          <EditorContextProvider settings={settings.toJSON()}>
            <Main />
          </EditorContextProvider>
        </RequestContextProvider>
      </ServicesContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => unmountComponentAtNode(element);
}
