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
  ApplicationStart,
  DocLinksStart,
  HttpSetup,
} from '@kbn/core/public';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { ElasticV3BrowserShipper } from '@kbn/analytics-shippers-elastic-v3-browser';

import { of } from 'rxjs';
import { FetchTelemetryConfigResponse, FetchTelemetryConfigRoute } from '../common/routes';
import { TelemetrySender, TelemetryService, TelemetryNotifications } from './services';
import { renderWelcomeTelemetryNotice } from './render_welcome_telemetry_notice';

/**
 * Publicly exposed APIs from the Telemetry Service
 */
export interface TelemetryServicePublicApis {
  /** Is the cluster opted-in to telemetry? **/
  getIsOptedIn: () => boolean | null;
  /** Is the user allowed to change the opt-in/out status? **/
  userCanChangeSettings: boolean;
  /** Can phone-home telemetry calls be made? This depends on whether we have opted-in or if we are rendering a report */
  canSendTelemetry: () => boolean;
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
export interface TelemetryConstants {
  /** Elastic's privacy statement url **/
  getPrivacyStatementUrl: () => string;
}

export interface TelemetryPluginStart {
  /** {@link TelemetryServicePublicApis} **/
  telemetryService: TelemetryServicePublicApis;
  /** Notification helpers **/
  telemetryNotifications: {
    /** Notify that the user has been presented with the opt-in/out notice. */
    setOptedInNoticeSeen: () => Promise<void>;
  };
  /** Set of publicly exposed telemetry constants **/
  telemetryConstants: TelemetryConstants;
}

interface TelemetryPluginSetupDependencies {
  screenshotMode: ScreenshotModePluginSetup;
  home?: HomePublicPluginSetup;
}

/**
 * Public-exposed configuration
 */
export interface TelemetryPluginConfig {
  /** The banner is expected to be shown when needed **/
  banner: boolean;
  /** Does the cluster allow changing the opt-in/out status via the UI? **/
  allowChangingOptInStatus: boolean;
  /** Is the cluster opted-in? **/
  optIn: boolean | null;
  /** Specify if telemetry should send usage to the prod or staging remote telemetry service **/
  sendUsageTo: 'prod' | 'staging';
  /** Should the telemetry payloads be sent from the server or the browser? **/
  sendUsageFrom: 'browser' | 'server';
  /** Should notify the user about the opt-in status? **/
  telemetryNotifyUserAboutOptInDefault?: boolean;
  /** Does the user have enough privileges to change the settings? **/
  userCanChangeSettings?: boolean;
  /** Should we hide the privacy statement notice? Useful on some environments, e.g. Cloud */
  hidePrivacyStatement?: boolean;
  /** Extra labels to add to the telemetry context */
  labels: Record<string, unknown>;
}

function getTelemetryConstants(docLinks: DocLinksStart): TelemetryConstants {
  return {
    getPrivacyStatementUrl: () => docLinks.links.legal.privacyStatement,
  };
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

  public setup(
    { analytics, http, notifications, getStartServices }: CoreSetup,
    { screenshotMode, home }: TelemetryPluginSetupDependencies
  ): TelemetryPluginSetup {
    const config = this.config;
    const currentKibanaVersion = this.currentKibanaVersion;
    this.telemetryService = new TelemetryService({
      config,
      isScreenshotMode: screenshotMode.isScreenshotMode(),
      http,
      notifications,
      currentKibanaVersion,
    });

    let telemetryConstants: TelemetryConstants;

    getStartServices().then(([{ docLinks }]) => {
      telemetryConstants = getTelemetryConstants(docLinks);
    });

    analytics.registerContextProvider({
      name: 'telemetry labels',
      context$: of({ labels: this.config.labels }),
      schema: {
        labels: {
          type: 'pass_through',
          _meta: {
            description: 'Custom labels added to the telemetry.labels config in the kibana.yml',
          },
        },
      },
    });

    analytics.registerShipper(ElasticV3BrowserShipper, {
      channelName: 'kibana-browser',
      version: currentKibanaVersion,
      sendTo: config.sendUsageTo === 'prod' ? 'production' : 'staging',
    });

    this.telemetrySender = new TelemetrySender(this.telemetryService, async () => {
      await this.refreshConfig(http);
      analytics.optIn({ global: { enabled: this.telemetryService!.isOptedIn } });
    });

    if (home && !this.config.hidePrivacyStatement) {
      home.welcomeScreen.registerOnRendered(() => {
        if (this.telemetryService?.userCanChangeSettings) {
          this.telemetryNotifications?.setOptedInNoticeSeen();
        }
      });

      home.welcomeScreen.registerTelemetryNoticeRenderer(() =>
        renderWelcomeTelemetryNotice(
          this.telemetryService!,
          http.basePath.prepend,
          telemetryConstants
        )
      );
    }

    return {
      telemetryService: this.getTelemetryServicePublicApis(),
    };
  }

  public start({
    analytics,
    http,
    overlays,
    theme,
    application,
    docLinks,
  }: CoreStart): TelemetryPluginStart {
    if (!this.telemetryService) {
      throw Error('Telemetry plugin failed to initialize properly.');
    }

    this.canUserChangeSettings = this.getCanUserChangeSettings(application);
    this.telemetryService.userCanChangeSettings = this.canUserChangeSettings;
    const telemetryConstants = getTelemetryConstants(docLinks);

    const telemetryNotifications = new TelemetryNotifications({
      http,
      overlays,
      theme,
      telemetryService: this.telemetryService,
      telemetryConstants,
    });
    this.telemetryNotifications = telemetryNotifications;

    application.currentAppId$.subscribe(async () => {
      const isUnauthenticated = this.getIsUnauthenticated(http);
      if (isUnauthenticated) {
        return;
      }

      // Refresh and get telemetry config
      const updatedConfig = await this.refreshConfig(http);

      analytics.optIn({ global: { enabled: this.telemetryService!.isOptedIn } });

      const telemetryBanner = updatedConfig?.banner;

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
      telemetryConstants,
    };
  }

  public stop() {
    this.telemetrySender?.stop();
  }

  private getTelemetryServicePublicApis(): TelemetryServicePublicApis {
    const telemetryService = this.telemetryService!;
    return {
      getIsOptedIn: () => telemetryService.getIsOptedIn(),
      setOptIn: (optedIn) => telemetryService.setOptIn(optedIn),
      canSendTelemetry: () => telemetryService.canSendTelemetry(),
      userCanChangeSettings: telemetryService.userCanChangeSettings,
      getCanChangeOptInStatus: () => telemetryService.getCanChangeOptInStatus(),
      fetchExample: () => telemetryService.fetchExample(),
    };
  }

  /**
   * Retrieve the up-to-date configuration
   * @param http HTTP helper to make requests to the server
   * @private
   */
  private async refreshConfig(http: HttpStart | HttpSetup): Promise<TelemetryPluginConfig> {
    const updatedConfig = await this.fetchUpdatedConfig(http);
    if (this.telemetryService) {
      this.telemetryService.config = updatedConfig;
    }
    return updatedConfig;
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

  /**
   * Fetch configuration from the server and merge it with the one the browser already knows
   * @param http The HTTP helper to make the requests
   * @private
   */
  private async fetchUpdatedConfig(http: HttpStart | HttpSetup): Promise<TelemetryPluginConfig> {
    const { allowChangingOptInStatus, optIn, sendUsageFrom, telemetryNotifyUserAboutOptInDefault } =
      await http.get<FetchTelemetryConfigResponse>(FetchTelemetryConfigRoute);

    return {
      ...this.config,
      allowChangingOptInStatus,
      optIn,
      sendUsageFrom,
      telemetryNotifyUserAboutOptInDefault,
      userCanChangeSettings: this.canUserChangeSettings,
    };
  }
}
