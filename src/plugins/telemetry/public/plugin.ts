/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Plugin, CoreSetup, CoreStart, HttpSetup } from '../../../core/public';

import { TelemetrySender, TelemetryService, TelemetryNotifications } from './services';

export interface TelemetryPluginStart {
  telemetryService: TelemetryService;
  telemetryNotifications: TelemetryNotifications;
}

export class TelemetryPlugin implements Plugin<void, TelemetryPluginStart> {
  private isUnauthenticated: boolean = true;

  public setup({ http }: CoreSetup) {
    this.isUnauthenticated = this.getIsUnauthenticated(http);
  }

  public start({
    injectedMetadata,
    application,
    http,
    notifications,
    overlays,
  }: CoreStart): TelemetryPluginStart {
    const isPluginEnabled = injectedMetadata.getInjectedVar('telemetryEnabled') as boolean;
    const telemetryBanner = injectedMetadata.getInjectedVar('telemetryBanner') as boolean;
    const sendUsageFrom = injectedMetadata.getInjectedVar('telemetrySendUsageFrom') as
      | 'browser'
      | 'server';

    const telemetryService = new TelemetryService({
      http,
      injectedMetadata,
      notifications,
    });

    const telemetryNotifications = new TelemetryNotifications({
      overlays,
      telemetryService,
    });

    this.maybeStartTelemetryPoller({
      telemetryService,
      isPluginEnabled,
      sendUsageFrom,
    });

    // const isStatusPage = chrome.getApp().id === 'status_page';
    if (telemetryBanner) {
      this.maybeShowOptedInNotificationBanner({
        telemetryNotifications,
      });
      this.maybeShowOptInBanner({
        telemetryNotifications,
      });
    }

    return {
      telemetryService,
      telemetryNotifications,
    };
  }

  private getIsUnauthenticated(http: HttpSetup) {
    const { anonymousPaths } = http;
    return anonymousPaths.isAnonymous(window.location.pathname);
  }

  private maybeStartTelemetryPoller({
    telemetryService,
    isPluginEnabled,
    sendUsageFrom,
  }: {
    telemetryService: TelemetryService;
    isPluginEnabled: boolean;
    sendUsageFrom: string;
  }) {
    if (isPluginEnabled && sendUsageFrom === 'browser') {
      const sender = new TelemetrySender(telemetryService);

      if (!this.isUnauthenticated) {
        sender.startChecking();
      }
    }
  }

  private maybeShowOptedInNotificationBanner({
    telemetryNotifications,
  }: {
    telemetryNotifications: TelemetryNotifications;
  }) {
    if (this.isUnauthenticated) {
      return;
    }

    const shouldShowBanner = telemetryNotifications.shouldShowOptedInNoticeBanner();
    if (shouldShowBanner) {
      telemetryNotifications.renderOptedInNoticeBanner();
    }
  }

  private maybeShowOptInBanner({
    telemetryNotifications,
  }: {
    telemetryNotifications: TelemetryNotifications;
  }) {
    if (this.isUnauthenticated) {
      return;
    }

    const shouldShowBanner = telemetryNotifications.shouldShowOptInBanner();
    if (shouldShowBanner) {
      telemetryNotifications.renderOptInBanner();
    }
  }
}
