/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  Plugin,
  CoreStart,
  CoreSetup,
  HttpStart,
  PluginInitializerContext,
  SavedObjectsClientContract,
  SavedObjectsBatchResponse,
  ApplicationStart,
} from 'src/core/public';

import { TelemetrySender, TelemetryService, TelemetryNotifications } from './services';
import type {
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

/**
 * Publicly exposed APIs from the Telemetry Service
 */
export interface TelemetryServicePublicApis {
  /** Is the cluster opted-in to telemetry? **/
  getIsOptedIn: () => boolean | null;
  /** Is the user allowed to change the opt-in/out status? **/
  userCanChangeSettings: boolean;
  /** Is the cluster allowed to change the opt-in/out status? **/
  getCanChangeOptInStatus: () => boolean;
  /** Fetches an unencrypted telemetry payload so we can show it to the user **/
  fetchExample: () => Promise<unknown[]>;
  /**
   * Overwrite the opt-in status.
   * It will send a final request to the remote telemetry cluster to report about the opt-in/out change.
   * @param optedIn Whether the user is opting-in (`true`) or out (`false`).
   */
  setOptIn: (optedIn: boolean) => Promise<boolean>;
}

/**
 * Public's setup exposed APIs by the telemetry plugin
 */
export interface TelemetryPluginSetup {
  /** {@link TelemetryService} **/
  telemetryService: TelemetryServicePublicApis;
}

/**
 * Public's start exposed APIs by the telemetry plugin
 */
export interface TelemetryPluginStart {
  /** {@link TelemetryServicePublicApis} **/
  telemetryService: TelemetryServicePublicApis;
  /** Notification helpers **/
  telemetryNotifications: {
    /** Notify that the user has been presented with the opt-in/out notice. */
    setOptedInNoticeSeen: () => Promise<void>;
  };
  /** Set of publicly exposed telemetry constants **/
  telemetryConstants: {
    /** Elastic's privacy statement url **/
    getPrivacyStatementUrl: () => string;
  };
}

/**
 * Public-exposed configuration
 */
export interface TelemetryPluginConfig {
  /** Is the plugin enabled? **/
  enabled: boolean;
  /** Remote telemetry service's URL **/
  url: string;
  /** The banner is expected to be shown when needed **/
  banner: boolean;
  /** Does the cluster allow changing the opt-in/out status via the UI? **/
  allowChangingOptInStatus: boolean;
  /** Is the cluster opted-in? **/
  optIn: boolean | null;
  /** Opt-in/out notification URL **/
  optInStatusUrl: string;
  /** Should the telemetry payloads be sent from the server or the browser? **/
  sendUsageFrom: 'browser' | 'server';
  /** Should notify the user about the opt-in status? **/
  telemetryNotifyUserAboutOptInDefault?: boolean;
  /** Does the user have enough privileges to change the settings? **/
  userCanChangeSettings?: boolean;
}

export class TelemetryPlugin implements Plugin<TelemetryPluginSetup, TelemetryPluginStart> {
  private readonly currentKibanaVersion: string;
  private readonly config: TelemetryPluginConfig;
  private telemetrySender?: TelemetrySender;
  private telemetryNotifications?: TelemetryNotifications;
  private telemetryService?: TelemetryService;
  private canUserChangeSettings: boolean = true;

  constructor(initializerContext: PluginInitializerContext<TelemetryPluginConfig>) {
    this.currentKibanaVersion = initializerContext.env.packageInfo.version;
    this.config = initializerContext.config.get();
  }

  public setup({ http, notifications }: CoreSetup): TelemetryPluginSetup {
    const config = this.config;
    const currentKibanaVersion = this.currentKibanaVersion;
    this.telemetryService = new TelemetryService({
      config,
      http,
      notifications,
      currentKibanaVersion,
    });

    this.telemetrySender = new TelemetrySender(this.telemetryService);

    return {
      telemetryService: this.getTelemetryServicePublicApis(),
    };
  }

  public start({ http, overlays, application, savedObjects }: CoreStart): TelemetryPluginStart {
    if (!this.telemetryService) {
      throw Error('Telemetry plugin failed to initialize properly.');
    }

    this.canUserChangeSettings = this.getCanUserChangeSettings(application);
    this.telemetryService.userCanChangeSettings = this.canUserChangeSettings;

    const telemetryNotifications = new TelemetryNotifications({
      http,
      overlays,
      telemetryService: this.telemetryService,
    });
    this.telemetryNotifications = telemetryNotifications;

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
      telemetryService: this.getTelemetryServicePublicApis(),
      telemetryNotifications: {
        setOptedInNoticeSeen: () => telemetryNotifications.setOptedInNoticeSeen(),
      },
      telemetryConstants: {
        getPrivacyStatementUrl: () => PRIVACY_STATEMENT_URL,
      },
    };
  }

  private getTelemetryServicePublicApis(): TelemetryServicePublicApis {
    const telemetryService = this.telemetryService!;
    return {
      getIsOptedIn: () => telemetryService.getIsOptedIn(),
      setOptIn: (optedIn) => telemetryService.setOptIn(optedIn),
      userCanChangeSettings: telemetryService.userCanChangeSettings,
      getCanChangeOptInStatus: () => telemetryService.getCanChangeOptInStatus(),
      fetchExample: () => telemetryService.fetchExample(),
    };
  }

  /**
   * Can the user edit the saved objects?
   * This is a security feature, not included in the OSS build, so we need to fallback to `true`
   * in case it is `undefined`.
   * @param application CoreStart.application
   * @private
   */
  private getCanUserChangeSettings(application: ApplicationStart): boolean {
    return (application.capabilities?.savedObjectsManagement?.edit as boolean | undefined) ?? true;
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
      userCanChangeSettings: this.canUserChangeSettings,
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
