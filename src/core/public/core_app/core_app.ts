/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { UnregisterCallback } from 'history';
import type {
  AppMountParameters,
  InternalApplicationSetup,
  InternalApplicationStart,
} from '../application/types';
import { AppNavLinkStatus } from '../application/types';
import type { CoreContext } from '../core_system';
import type { DocLinksStart } from '../doc_links/doc_links_service';
import type { HttpSetup, HttpStart } from '../http/types';
import type { InjectedMetadataSetup } from '../injected_metadata/injected_metadata_service';
import type {
  NotificationsSetup,
  NotificationsStart,
} from '../notifications/notifications_service';
import type { IUiSettingsClient } from '../ui_settings/types';
import { renderApp as renderErrorApp } from './errors/error_application';
import { setupPublicBaseUrlConfigWarning } from './errors/public_base_url';
import { setupUrlOverflowDetection } from './errors/url_overflow';
import { renderApp as renderStatusApp } from './status/render_app';

interface SetupDeps {
  application: InternalApplicationSetup;
  http: HttpSetup;
  injectedMetadata: InjectedMetadataSetup;
  notifications: NotificationsSetup;
}

interface StartDeps {
  application: InternalApplicationStart;
  docLinks: DocLinksStart;
  http: HttpStart;
  notifications: NotificationsStart;
  uiSettings: IUiSettingsClient;
}

export class CoreApp {
  private stopHistoryListening?: UnregisterCallback;

  constructor(private readonly coreContext: CoreContext) {}

  public setup({ application, http, injectedMetadata, notifications }: SetupDeps) {
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

  public start({ application, docLinks, http, notifications, uiSettings }: StartDeps) {
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
