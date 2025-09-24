/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { noop } from 'lodash';
// import 'monaco-editor/min/vs/editor/editor.main.css';

// Disable Monaco workers entirely to prevent "Unexpected usage" errors
// This sacrifices some language features but allows the editor to work in external apps
(window as any).MonacoEnvironment = {
  getWorker: function () {
    // Return a minimal mock worker that doesn't actually do anything
    return {
      postMessage: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      terminate: () => {},
      onerror: null,
      onmessage: null,
      onmessageerror: null
    };
  }
};

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { DocLinksService } from '@kbn/core-doc-links-browser-internal';
import type { CoreContext } from '@kbn/core-base-browser-internal';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { HttpService } from '@kbn/core-http-browser-internal';
import { ExecutionContextService } from '@kbn/core-execution-context-browser-internal';
import { FatalErrorsService } from '@kbn/core-fatal-errors-browser-internal';
import { AnalyticsService } from '@kbn/core-analytics-browser-internal';
import { ThemeService } from '@kbn/core-theme-browser-internal';
import { I18nService } from '@kbn/core-i18n-browser-internal';
import { i18n } from '@kbn/i18n';
import { type HttpSetup } from '@kbn/core/public';
import { createStorage, createHistory, createSettings, setStorage } from '../../public/services';
import { loadActiveApi } from '../../public/lib/kb';

import { createPackagingParsedRequestsProvider } from './parser';
import { injectedMetadata, coreContext, trackUiMetric } from './mocked_dependencies';

import * as localStorageObjectClient from '../../public/lib/local_storage_object_client';
import { Main } from '../../public/application/containers';

import {
  ServicesContextProvider,
  EditorContextProvider,
  RequestContextProvider,
} from '../../public/application/contexts';
import { createApi, createEsHostService } from '../../public/application/lib';
import { AutocompleteInfo, setAutocompleteInfo } from '../../public/services';
import type { OneConsoleProps } from './types';
import type { NotificationsSetup } from '@kbn/core/public';

// Import all translation files statically so webpack includes them in the bundle
const translations = {
  en: {
    formats: {},
    messages: {},
  },
  'fr-FR': require('./translations/fr-FR.json'),
  'ja-JP': require('./translations/ja-JP.json'),
  'zh-CN': require('./translations/zh-CN.json'),
};

export const OneConsole = ({ lang = 'en', http: customHttp, notifications: customNotifications }: OneConsoleProps) => {
  // Get the translations for the selected language, fallback to English
  const selectedTranslations = translations[lang] || translations.en;

  // Configure the global @kbn/i18n system with the same translations
  i18n.init({
    locale: lang,
    formats: selectedTranslations.formats,
    messages: selectedTranslations.messages,
  });

  const docLinksService = new DocLinksService(coreContext as CoreContext);
  docLinksService.setup();
  const docLinks = docLinksService.start({ injectedMetadata });

  const i18nService = new I18nService();

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
    i18n: i18nService.getContext(),
  });

  // Use the custom notifications provided by the consumer
  const notifications = {
    toasts: {
      addSuccess: customNotifications.addSuccess || noop,
      addWarning: customNotifications.addWarning || noop,
      addDanger: customNotifications.addDanger || noop,
      addError: customNotifications.addError || noop,
      add: customNotifications.add || noop,
      remove: customNotifications.remove || noop,
    }
  };

  const executionContextService = new ExecutionContextService();
  const executionContext = executionContextService.setup({ analytics });

  const httpService = new HttpService();
  const originalHttp = httpService.setup({
    injectedMetadata,
    fatalErrors,
    executionContext,
  });

  const http = {
    ...originalHttp,
    ...customHttp,
  } as HttpSetup;

  useEffect(() => {
    const loadApi = async () => {
      try {
        await loadActiveApi(http);
      } catch (error) {
        console.error('[DEBUG] Error loading active API:', error);
      }
    };

    loadApi();
  }, []);

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

  // IMPORTANT: Set the global autocompleteInfo so getAutocompleteInfo() works
  setAutocompleteInfo(autocompleteInfo);

  return (
    <IntlProvider locale={lang} messages={selectedTranslations.messages}>
      <ServicesContextProvider
        value={{
          analytics: {
            reportEvent: () => {},
          },
          i18n: i18nService.getContext(),
          theme: {
            theme$: theme.theme$,
          },
          userProfile: {
            getUserProfile$: () => ({ pipe: () => ({ subscribe: () => {} }) }),
            userProfile: null,
          } as any,
          docLinkVersion: docLinks.DOC_LINK_VERSION,
          docLinks: docLinks.links,
          services: {
            esHostService,
            storage,
            history: storageHistory,
            settings,
            notifications: notifications as NotificationsSetup,
            trackUiMetric,
            objectStorageClient,
            http,
            autocompleteInfo,
            // Mock required services that aren't available in packaging
            dataViews: {} as any,
            data: {} as any,
            licensing: {} as any,
            application: {} as any,
          },
          config: {
            isDevMode: false,
          },
        }}
      >
        <RequestContextProvider>
          <EditorContextProvider
            settings={settings.toJSON()}
            customParsedRequestsProvider={createPackagingParsedRequestsProvider()}
          >
            <div className="kbnConsole">
              <Main />
            </div>
          </EditorContextProvider>
        </RequestContextProvider>
      </ServicesContextProvider>
    </IntlProvider>
  );
};
