/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UnregisterCallback } from 'history';
import type { CoreContext } from '@kbn/core-base-browser-internal';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { HttpSetup, HttpStart } from '@kbn/core-http-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { NotificationsSetup, NotificationsStart } from '@kbn/core-notifications-browser';
import { AppNavLinkStatus, type AppMountParameters } from '@kbn/core-application-browser';
import type {
  InternalApplicationSetup,
  InternalApplicationStart,
} from '@kbn/core-application-browser-internal';
import {
  renderApp as renderErrorApp,
  setupPublicBaseUrlConfigWarning,
  setupUrlOverflowDetection,
} from './errors';
import { renderApp as renderStatusApp } from './status';

export interface CoreAppsServiceSetupDeps {
  application: InternalApplicationSetup;
  http: HttpSetup;
  injectedMetadata: InternalInjectedMetadataSetup;
  notifications: NotificationsSetup;
}

export interface CoreAppsServiceStartDeps {
  application: InternalApplicationStart;
  docLinks: DocLinksStart;
  http: HttpStart;
  notifications: NotificationsStart;
  uiSettings: IUiSettingsClient;
}

export class CoreAppsService {
  private stopHistoryListening?: UnregisterCallback;

  constructor(private readonly coreContext: CoreContext) {}

  public setup({ application, http, injectedMetadata, notifications }: CoreAppsServiceSetupDeps) {
    application.register(this.coreContext.coreId, {
      id: 'error',
      title: 'App Error',
      navLinkStatus: AppNavLinkStatus.hidden,
      mount(params: AppMountParameters) {
        // Do not use an async import here in order to ensure that network failures
        // cannot prevent the error UI from displaying. This UI is tiny so an async
        // import here is probably not useful anyways.
        return renderErrorApp(params, { basePath: http.basePath });
      },
    });

    if (injectedMetadata.getAnonymousStatusPage()) {
      http.anonymousPaths.register('/status');
    }
    application.register(this.coreContext.coreId, {
      id: 'status',
      title: 'Server Status',
      appRoute: '/status',
      chromeless: true,
      navLinkStatus: AppNavLinkStatus.hidden,
      mount(params: AppMountParameters) {
        return renderStatusApp(params, { http, notifications });
      },
    });
  }

  public start({
    application,
    docLinks,
    http,
    notifications,
    uiSettings,
  }: CoreAppsServiceStartDeps) {
    if (!application.history) {
      return;
    }

    this.stopHistoryListening = setupUrlOverflowDetection({
      basePath: http.basePath,
      history: application.history,
      toasts: notifications.toasts,
      uiSettings,
    });

    setupPublicBaseUrlConfigWarning({ docLinks, http, notifications });
  }

  public stop() {
    if (this.stopHistoryListening) {
      this.stopHistoryListening();
      this.stopHistoryListening = undefined;
    }
  }
}
