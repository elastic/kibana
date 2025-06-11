/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import {
  createStorage,
  createHistory,
  createSettings,
  setStorage,
} from '../public/services';
import { IntlProvider } from 'react-intl';
import { createMemoryHistory } from 'history';
import { DocLinksService } from '@kbn/core-doc-links-browser-internal';
// import { NotificationsService } from '@kbn/core-notifications-browser-internal';
import type { CoreContext } from '@kbn/core-base-browser-internal';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import { notificationServiceMock } from './notifications.mock';
import { HttpService } from '@kbn/core-http-browser-internal';
import { ExecutionContextService } from '@kbn/core-execution-context-browser-internal';
import { FatalErrorsService } from '@kbn/core-fatal-errors-browser-internal';
import { AnalyticsService } from '@kbn/core-analytics-browser-internal';
import { ThemeService } from '@kbn/core-theme-browser-internal';
import { I18nService } from '@kbn/core-i18n-browser-internal';
import { type HttpSetup } from '@kbn/core/public';

import { loadActiveApi } from '../public/lib/kb';
import * as localStorageObjectClient from '../public/lib/local_storage_object_client';
import { Main } from '../public/application/containers';

import { ServicesContextProvider, EditorContextProvider, RequestContextProvider } from '../public/application/contexts';
import { createApi, createEsHostService } from '../public/application/lib';
import { ConsoleStartServices } from '../public/types';
import { AutocompleteInfo } from '../public/services';


export interface BootDependencies extends ConsoleStartServices {
}

const trackUiMetricMock = { count: () => {}, load: () => {} };
const injectedMetadata = {
  getKibanaBranch: () => 'main',
  getKibanaVersion: () => '9.1.0',
  getKibanaBuildNumber: () => 12345,
  getBasePath: () => '',
  getServerBasePath: () => '',
  getPublicBaseUrl: () => '',
  getElasticsearchInfo: () => ({
    cluster_uuid: 'test-cluster-uuid',
    cluster_name: 'test-cluster-name',
    cluster_version: '8.0.0',
    cluster_build_flavor: 'development',
  }),
  getCspConfig: () => ({
    warnLegacyBrowsers: true,
  }) as unknown,
  getTheme: () => ({
    darkMode: 'light',
    name: 'default',
    version: '1.0.0',
    stylesheetPaths: {
      default: [],
      dark: [],
    },
  }) as unknown,
  getExternalUrlConfig: () => ({
    policy: [
      {
        allow: true,
        host: undefined,
        protocol: undefined,
      }
    ]
  }),
  getAnonymousStatusPage: () => false,
  getLegacyMetadata: () => ({}) as unknown,
  getPlugins: () => [],
  getAssetsHrefBase: () => '/ui/',
} as unknown as InternalInjectedMetadataSetup;
const createLogger = (name?: string) => ({
  debug: (...args: any[]) => console.debug(`[DEBUG]${name ? ` [${name}]` : ''}`, ...args),
  info: (...args: any[]) => console.info(`[INFO]${name ? ` [${name}]` : ''}`, ...args),
  warn: (...args: any[]) => console.warn(`[WARN]${name ? ` [${name}]` : ''}`, ...args),
  error: (...args: any[]) => console.error(`[ERROR]${name ? ` [${name}]` : ''}`, ...args),
  trace: (...args: any[]) => console.trace(`[TRACE]${name ? ` [${name}]` : ''}`, ...args),
  fatal: (...args: any[]) => console.error(`[FATAL]${name ? ` [${name}]` : ''}`, ...args),
  log: (...args: any[]) => console.log(`[LOG]${name ? ` [${name}]` : ''}`, ...args),
  get: (childName?: string) => createLogger(childName || name),
});

const coreContext = {
  coreId: Symbol('core'),
  logger: {
    get: createLogger
  },
  env: {
    packageInfo: { buildFlavor: 'development' },
    mode: {
      name: 'development',
      dev: true,
    }
  }
};

export const OneConsole = ({ }: BootDependencies) => {
  let docLinksService = new DocLinksService(coreContext as CoreContext);
  docLinksService.setup();
  const docLinks = docLinksService.start({ injectedMetadata });

  // const notificationService = new NotificationsService();
  // notificationsService.setup({ uiSettings, analytics });
  // const notifications = notificationService.start({
    // analytics,
    // overlays,
    // targetDomElement: notificationsTargetDomElement,
    // rendering,
  // });

  const i18n = new I18nService();

  const themeService = new ThemeService();
  const theme = themeService.setup({ injectedMetadata });

  const analyticsService = new AnalyticsService(coreContext as CoreContext);
  const analytics = analyticsService.setup({ injectedMetadata });

  const rootDomElement = document.getElementById('root')!;
  const fatalErrorsService = new FatalErrorsService(rootDomElement, () => {
    console.log('FATAL ERROR OCURRED');
  });
  const fatalErrors = fatalErrorsService.setup({
    injectedMetadata,
    analytics,
    theme,
    i18n: i18n.getContext(),
  });

  const executionContextService = new ExecutionContextService();
  const executionContext = executionContextService.setup({ analytics });

  const httpService = new HttpService();
  const http = httpService.setup({
    injectedMetadata,
    fatalErrors,
    executionContext,
  }) as HttpSetup;

  // await loadActiveApi(http);

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

  // Initialize autocompleteInfo like in the plugin
  const autocompleteInfo = new AutocompleteInfo();
  autocompleteInfo.setup(http);
  autocompleteInfo.mapping.setup(http, settings);

  return (
    <IntlProvider locale="en">
      <ServicesContextProvider
        value={{
          // ...coreStart,
          docLinkVersion: docLinks.DOC_LINK_VERSION,
          docLinks: docLinks.links,
          services: {
            esHostService,
            storage,
            history: storageHistory,
            routeHistory: createMemoryHistory(),
            settings,
            notifications: notificationServiceMock.createStartContract(),
            trackUiMetric: trackUiMetricMock,
            objectStorageClient,
            http,
            autocompleteInfo,
          },
          config: {
            isDevMode: false,
          },
        }}
      >
        <RequestContextProvider>
          <EditorContextProvider settings={settings.toJSON()}>
            <Main />
          </EditorContextProvider>
        </RequestContextProvider>
      </ServicesContextProvider>
    </IntlProvider>
  );
}
