/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { UnregisterCallback } from 'history';
import {
  InternalApplicationSetup,
  InternalApplicationStart,
  AppNavLinkStatus,
  AppMountParameters,
} from '../application';
import type { HttpSetup, HttpStart } from '../http';
import type { CoreContext } from '../core_system';
import type { NotificationsSetup, NotificationsStart } from '../notifications';
import type { IUiSettingsClient } from '../ui_settings';
import type { InjectedMetadataSetup } from '../injected_metadata';
import { renderApp as renderErrorApp, setupUrlOverflowDetection } from './errors';
import { renderApp as renderStatusApp } from './status';

interface SetupDeps {
  application: InternalApplicationSetup;
  http: HttpSetup;
  injectedMetadata: InjectedMetadataSetup;
  notifications: NotificationsSetup;
}

interface StartDeps {
  application: InternalApplicationStart;
  http: HttpStart;
  notifications: NotificationsStart;
  uiSettings: IUiSettingsClient;
}

export class CoreApp {
  private stopHistoryListening?: UnregisterCallback;

  constructor(private readonly coreContext: CoreContext) {}

  public setup({ http, application, injectedMetadata, notifications }: SetupDeps) {
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

  public start({ application, http, notifications, uiSettings }: StartDeps) {
    if (!application.history) {
      return;
    }

    this.stopHistoryListening = setupUrlOverflowDetection({
      basePath: http.basePath,
      history: application.history,
      toasts: notifications.toasts,
      uiSettings,
    });
  }

  public stop() {
    if (this.stopHistoryListening) {
      this.stopHistoryListening();
      this.stopHistoryListening = undefined;
    }
  }
}
