/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { Observable } from 'rxjs';
import {
  HttpSetup,
  NotificationsStart,
  CoreTheme,
  DocLinksStart,
  CoreStart,
} from '@kbn/core/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';

import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { EuiWindowEvent } from '@elastic/eui';
import { ObjectStorageClient } from '../../../../common/types';

import * as localStorageObjectClient from '../../../lib/local_storage_object_client';
import { loadActiveApi } from '../../../lib/kb';
import {
  getAutocompleteInfo,
  AutocompleteInfo,
  History,
  Settings,
  Storage,
  createHistory,
  createSettings,
  getStorage,
} from '../../../services';
import { createUsageTracker } from '../../../services/tracker';
import {
  MetricsTracker,
  EmbeddableConsoleDependencies,
  ConsoleStartServices,
} from '../../../types';

import { createApi, createEsHostService } from '../../lib';
import { EsHostService } from '../../lib/es_host_service';

import {
  ServicesContextProvider,
  EditorContextProvider,
  RequestContextProvider,
} from '../../contexts';
import { Main } from '../main';
import { EditorContentSpinner } from '../../components';

interface ConsoleDependencies extends ConsoleStartServices {
  autocompleteInfo: AutocompleteInfo;
  docLinks: DocLinksStart['links'];
  docLinkVersion: string;
  esHostService: EsHostService;
  history: History;
  http: HttpSetup;
  notifications: NotificationsStart;
  objectStorageClient: ObjectStorageClient;
  settings: Settings;
  storage: Storage;
  theme$: Observable<CoreTheme>;
  trackUiMetric: MetricsTracker;
}

const loadDependencies = async (
  core: CoreStart,
  usageCollection?: UsageCollectionStart
): Promise<ConsoleDependencies> => {
  const {
    docLinks: { DOC_LINK_VERSION, links },
    http,
    notifications,
    ...startServices
  } = core;
  const trackUiMetric = createUsageTracker(usageCollection);
  trackUiMetric.load('opened_embedded_app');

  await loadActiveApi(core.http);
  const autocompleteInfo = getAutocompleteInfo();
  const storage = getStorage();
  const history = createHistory({ storage });
  const settings = createSettings({ storage });
  const objectStorageClient = localStorageObjectClient.create(storage);
  const api = createApi({ http });
  const esHostService = createEsHostService({ api });

  autocompleteInfo.mapping.setup(http, settings);
  return {
    ...startServices,
    autocompleteInfo,
    docLinks: links,
    docLinkVersion: DOC_LINK_VERSION,
    esHostService,
    history,
    http,
    notifications,
    objectStorageClient,
    settings,
    storage,
    theme$: startServices.theme.theme$,
    trackUiMetric,
  };
};

interface ConsoleWrapperProps
  extends Omit<
    EmbeddableConsoleDependencies,
    'setDispatch' | 'alternateView' | 'setConsoleHeight' | 'getConsoleHeight'
  > {
  onKeyDown: (this: Window, ev: WindowEventMap['keydown']) => any;
  isOpen: boolean;
}

export const ConsoleWrapper = (props: ConsoleWrapperProps) => {
  const [dependencies, setDependencies] = useState<ConsoleDependencies | null>(null);
  const { core, usageCollection, onKeyDown, isMonacoEnabled, isDevMode, isOpen } = props;

  useEffect(() => {
    if (dependencies === null && isOpen) {
      loadDependencies(core, usageCollection).then(setDependencies);
    }
  }, [dependencies, setDependencies, core, usageCollection, isOpen]);

  if (!dependencies && !isOpen) {
    // Console has not been opened
    return null;
  }

  if (!dependencies) {
    // Console open for the first time, wait for dependencies to load.
    return <EditorContentSpinner />;
  }

  const {
    autocompleteInfo,
    docLinkVersion,
    docLinks,
    esHostService,
    history,
    http,
    notifications,
    objectStorageClient,
    settings,
    storage,
    trackUiMetric,
    ...startServices
  } = dependencies;
  return (
    <KibanaRenderContextProvider {...core}>
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
            {isOpen ? (
              <div className="embeddableConsole__content" data-test-subj="consoleEmbeddedBody">
                <EuiWindowEvent event="keydown" handler={onKeyDown} />
                <Main hideWelcome />
              </div>
            ) : (
              <span />
            )}
          </EditorContextProvider>
        </RequestContextProvider>
      </ServicesContextProvider>
    </KibanaRenderContextProvider>
  );
};
