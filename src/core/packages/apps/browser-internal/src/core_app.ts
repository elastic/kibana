/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UnregisterCallback } from 'history';
import type { CoreContext } from '@kbn/core-base-browser-internal';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { InternalHttpSetup, InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { NotificationsSetup, NotificationsStart } from '@kbn/core-notifications-browser';
import { type AppMountParameters } from '@kbn/core-application-browser';
import type {
  InternalApplicationSetup,
  InternalApplicationStart,
} from '@kbn/core-application-browser-internal';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { renderApp as renderStatusApp } from './status';
import {
  renderApp as renderErrorApp,
  setupPublicBaseUrlConfigWarning,
  setupUrlOverflowDetection,
} from './errors';

export interface CoreAppsServiceSetupDeps {
  application: InternalApplicationSetup;
  http: InternalHttpSetup;
  injectedMetadata: InternalInjectedMetadataSetup;
  notifications: NotificationsSetup;
}

export interface CoreAppsServiceStartDeps {
  application: InternalApplicationStart;
  docLinks: DocLinksStart;
  http: InternalHttpStart;
  notifications: NotificationsStart;
  uiSettings: IUiSettingsClient;
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
}

export class CoreAppsService {
  private stopHistoryListening?: UnregisterCallback;

  constructor(private readonly coreContext: CoreContext) {}

  public setup({ application, http, injectedMetadata, notifications }: CoreAppsServiceSetupDeps) {
    application.register(this.coreContext.coreId, {
      id: 'error',
      title: 'App Error',
      visibleIn: [],
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
      visibleIn: [],
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
    ...startDeps
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

    setupPublicBaseUrlConfigWarning({ docLinks, http, notifications, ...startDeps });
  }

  public stop() {
    if (this.stopHistoryListening) {
      this.stopHistoryListening();
      this.stopHistoryListening = undefined;
    }
  }
}
