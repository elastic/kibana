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
import { HttpSetup, NotificationsSetup, DocLinksStart } from '@kbn/core/public';

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import {
  createStorage,
  createHistory,
  createSettings,
  AutocompleteInfo,
  setStorage,
} from '../services';
import { createUsageTracker } from '../services/tracker';
import { loadActiveApi } from '../lib/kb';
import * as localStorageObjectClient from '../lib/local_storage_object_client';
import { Main } from './containers';
import { ServicesContextProvider, EditorContextProvider, RequestContextProvider } from './contexts';
import { createApi, createEsHostService } from './lib';
import { ConsoleStartServices } from '../types';

export interface BootDependencies extends ConsoleStartServices {
  http: HttpSetup;
  docLinkVersion: string;
  notifications: NotificationsSetup;
  usageCollection?: UsageCollectionSetup;
  element: HTMLElement;
  docLinks: DocLinksStart['links'];
  autocompleteInfo: AutocompleteInfo;
  isMonacoEnabled: boolean;
  isDevMode: boolean;
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
          ...startServices,
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
            isDevMode,
          },
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
