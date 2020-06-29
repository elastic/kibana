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

import {
  Plugin,
  CoreStart,
  CoreSetup,
  HttpStart,
  PluginInitializerContext,
  SavedObjectsClientContract,
  SavedObjectsBatchResponse,
} from '../../../core/public';

import { TelemetrySender, TelemetryService, TelemetryNotifications } from './services';
import {
  TelemetrySavedObjectAttributes,
  TelemetrySavedObject,
} from '../common/telemetry_config/types';
import {
  getTelemetryAllowChangingOptInStatus,
  getTelemetryOptIn,
  getTelemetrySendUsageFrom,
} from '../common/telemetry_config';
import { getNotifyUserAboutOptInDefault } from '../common/telemetry_config/get_telemetry_notify_user_about_optin_default';
import { PRIVACY_STATEMENT_URL } from '../common/constants';

export interface TelemetryPluginSetup {
  telemetryService: TelemetryService;
}

export interface TelemetryPluginStart {
  telemetryService: TelemetryService;
  telemetryNotifications: TelemetryNotifications;
  telemetryConstants: {
    getPrivacyStatementUrl: () => string;
  };
}

export interface TelemetryPluginConfig {
  enabled: boolean;
  url: string;
  banner: boolean;
  allowChangingOptInStatus: boolean;
  optIn: boolean | null;
  optInStatusUrl: string;
  sendUsageFrom: 'browser' | 'server';
  telemetryNotifyUserAboutOptInDefault?: boolean;
}

export class TelemetryPlugin implements Plugin<TelemetryPluginSetup, TelemetryPluginStart> {
  private readonly currentKibanaVersion: string;
  private readonly config: TelemetryPluginConfig;
  private telemetrySender?: TelemetrySender;
  private telemetryNotifications?: TelemetryNotifications;
  private telemetryService?: TelemetryService;

  constructor(initializerContext: PluginInitializerContext<TelemetryPluginConfig>) {
    this.currentKibanaVersion = initializerContext.env.packageInfo.version;
    this.config = initializerContext.config.get();
  }

  public setup({ http, notifications }: CoreSetup): TelemetryPluginSetup {
    const config = this.config;
    this.telemetryService = new TelemetryService({ config, http, notifications });

    this.telemetrySender = new TelemetrySender(this.telemetryService);

    return {
      telemetryService: this.telemetryService,
    };
  }

  public start({ http, overlays, application, savedObjects }: CoreStart): TelemetryPluginStart {
    if (!this.telemetryService) {
      throw Error('Telemetry plugin failed to initialize properly.');
    }

    this.telemetryNotifications = new TelemetryNotifications({
      overlays,
      telemetryService: this.telemetryService,
    });

    application.currentAppId$.subscribe(async () => {
      const isUnauthenticated = this.getIsUnauthenticated(http);
      if (isUnauthenticated) {
        return;
      }

      // Update the telemetry config based as a mix of the config files and saved objects
      const telemetrySavedObject = await this.getTelemetrySavedObject(savedObjects.client);
      const updatedConfig = await this.updateConfigsBasedOnSavedObjects(telemetrySavedObject);
      this.telemetryService!.config = updatedConfig;

      const telemetryBanner = updatedConfig.banner;

      this.maybeStartTelemetryPoller();
      if (telemetryBanner) {
        this.maybeShowOptedInNotificationBanner();
        this.maybeShowOptInBanner();
      }
    });

    return {
      telemetryService: this.telemetryService,
      telemetryNotifications: this.telemetryNotifications,
      telemetryConstants: {
        getPrivacyStatementUrl: () => PRIVACY_STATEMENT_URL,
      },
    };
  }

  private getIsUnauthenticated(http: HttpStart) {
    const { anonymousPaths } = http;
    return anonymousPaths.isAnonymous(window.location.pathname);
  }

  private maybeStartTelemetryPoller() {
    if (!this.telemetrySender) {
      return;
    }

    this.telemetrySender.startChecking();
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

  private async updateConfigsBasedOnSavedObjects(
    telemetrySavedObject: TelemetrySavedObject
  ): Promise<TelemetryPluginConfig> {
    const configTelemetrySendUsageFrom = this.config.sendUsageFrom;
    const configTelemetryOptIn = this.config.optIn as boolean;
    const configTelemetryAllowChangingOptInStatus = this.config.allowChangingOptInStatus;

    const currentKibanaVersion = this.currentKibanaVersion;

    const allowChangingOptInStatus = getTelemetryAllowChangingOptInStatus({
      configTelemetryAllowChangingOptInStatus,
      telemetrySavedObject,
    });

    const optIn = getTelemetryOptIn({
      configTelemetryOptIn,
      allowChangingOptInStatus,
      telemetrySavedObject,
      currentKibanaVersion,
    });

    const sendUsageFrom = getTelemetrySendUsageFrom({
      configTelemetrySendUsageFrom,
      telemetrySavedObject,
    });

    const telemetryNotifyUserAboutOptInDefault = getNotifyUserAboutOptInDefault({
      telemetrySavedObject,
      allowChangingOptInStatus,
      configTelemetryOptIn,
      telemetryOptedIn: optIn,
    });

    return {
      ...this.config,
      optIn,
      sendUsageFrom,
      telemetryNotifyUserAboutOptInDefault,
    };
  }

  private async getTelemetrySavedObject(savedObjectsClient: SavedObjectsClientContract) {
    try {
      // Use bulk get API here to avoid the queue. This could fail independent requests if we don't have rights to access the telemetry object otherwise
      const {
        savedObjects: [{ attributes }],
      } = (await savedObjectsClient.bulkGet([
        {
          id: 'telemetry',
          type: 'telemetry',
        },
      ])) as SavedObjectsBatchResponse<TelemetrySavedObjectAttributes>;
      return attributes;
    } catch (error) {
      const errorCode = error[Symbol('SavedObjectsClientErrorCode')];
      if (errorCode === 'SavedObjectsClient/notFound') {
        return null;
      }

      if (errorCode === 'SavedObjectsClient/forbidden') {
        return false;
      }

      throw error;
    }
  }
}
