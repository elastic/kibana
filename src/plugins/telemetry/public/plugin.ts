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
import { Plugin, CoreStart, CoreSetup, HttpStart } from '../../../core/public';

import { TelemetrySender, TelemetryService, TelemetryNotifications } from './services';

export interface TelemetryPluginSetup {
  telemetryService: TelemetryService;
}

export interface TelemetryPluginStart {
  telemetryService: TelemetryService;
  telemetryNotifications: TelemetryNotifications;
}

export class TelemetryPlugin implements Plugin<TelemetryPluginSetup, TelemetryPluginStart> {
  private telemetrySender?: TelemetrySender;
  private telemetryNotifications?: TelemetryNotifications;
  private telemetryService?: TelemetryService;

  public setup({ http, injectedMetadata, notifications }: CoreSetup): TelemetryPluginSetup {
    this.telemetryService = new TelemetryService({
      http,
      injectedMetadata,
      notifications,
    });

    this.telemetrySender = new TelemetrySender(this.telemetryService);

    return {
      telemetryService: this.telemetryService,
    };
  }

  public start({ injectedMetadata, http, overlays, application }: CoreStart): TelemetryPluginStart {
    if (!this.telemetryService) {
      throw Error('Telemetry plugin failed to initialize properly.');
    }

    const telemetryBanner = injectedMetadata.getInjectedVar('telemetryBanner') as boolean;
    const sendUsageFrom = injectedMetadata.getInjectedVar('telemetrySendUsageFrom') as
      | 'browser'
      | 'server';

    this.telemetryNotifications = new TelemetryNotifications({
      overlays,
      telemetryService: this.telemetryService,
    });

    application.currentAppId$.subscribe(appId => {
      const isUnauthenticated = this.getIsUnauthenticated(http);
      if (isUnauthenticated) {
        return;
      }

      this.maybeStartTelemetryPoller({ sendUsageFrom });
      if (telemetryBanner) {
        this.maybeShowOptedInNotificationBanner();
        this.maybeShowOptInBanner();
      }
    });

    return {
      telemetryService: this.telemetryService,
      telemetryNotifications: this.telemetryNotifications,
    };
  }

  private getIsUnauthenticated(http: HttpStart) {
    const { anonymousPaths } = http;
    return anonymousPaths.isAnonymous(window.location.pathname);
  }

  private maybeStartTelemetryPoller({ sendUsageFrom }: { sendUsageFrom: string }) {
    if (!this.telemetrySender) {
      return;
    }
    if (sendUsageFrom === 'browser') {
      this.telemetrySender.startChecking();
    }
  }

  private maybeShowOptedInNotificationBanner() {
    if (!this.telemetryNotifications) {
      return;
    }
    const shouldShowBanner = this.telemetryNotifications.shouldShowOptedInNoticeBanner();
    if (shouldShowBanner) {
      this.telemetryNotifications.renderOptedInNoticeBanner();
    }
  }

  private maybeShowOptInBanner() {
    if (!this.telemetryNotifications) {
      return;
    }
    const shouldShowBanner = this.telemetryNotifications.shouldShowOptInBanner();
    if (shouldShowBanner) {
      this.telemetryNotifications.renderOptInBanner();
    }
  }
}
