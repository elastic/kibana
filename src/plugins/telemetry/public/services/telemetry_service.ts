/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';
import { TelemetryPluginConfig } from '../plugin';

interface TelemetryServiceConstructor {
  config: TelemetryPluginConfig;
  http: CoreStart['http'];
  notifications: CoreStart['notifications'];
  currentKibanaVersion: string;
  reportOptInStatusChange?: boolean;
}

/**
 * Handles caching telemetry config in the user's session and requests the
 * backend to fetch telemetry payload requests or notify about config changes.
 */
export class TelemetryService {
  private readonly http: CoreStart['http'];
  private readonly reportOptInStatusChange: boolean;
  private readonly notifications: CoreStart['notifications'];
  private readonly defaultConfig: TelemetryPluginConfig;
  private updatedConfig?: TelemetryPluginConfig;

  /** Current version of Kibana */
  public readonly currentKibanaVersion: string;

  constructor({
    config,
    http,
    notifications,
    currentKibanaVersion,
    reportOptInStatusChange = true,
  }: TelemetryServiceConstructor) {
    this.defaultConfig = config;
    this.reportOptInStatusChange = reportOptInStatusChange;
    this.notifications = notifications;
    this.currentKibanaVersion = currentKibanaVersion;
    this.http = http;
  }

  /**
   * Config setter to locally persist the updated configuration.
   * Useful for caching the configuration throughout the users' session,
   * so they don't need to refresh the page.
   * @param updatedConfig
   */
  public set config(updatedConfig: TelemetryPluginConfig) {
    this.updatedConfig = updatedConfig;
  }

  /** Returns the latest configuration **/
  public get config() {
    return { ...this.defaultConfig, ...this.updatedConfig };
  }

  /** Is the cluster opted-in to telemetry **/
  public get isOptedIn() {
    return this.config.optIn;
  }

  /** Changes the opt-in status **/
  public set isOptedIn(optIn) {
    this.config = { ...this.config, optIn };
  }

  /** true if the user has already seen the opt-in/out notice **/
  public get userHasSeenOptedInNotice() {
    return this.config.telemetryNotifyUserAboutOptInDefault;
  }

  /** Changes the notice visibility options **/
  public set userHasSeenOptedInNotice(telemetryNotifyUserAboutOptInDefault) {
    this.config = { ...this.config, telemetryNotifyUserAboutOptInDefault };
  }

  /** Is the cluster allowed to change the opt-in/out status **/
  public getCanChangeOptInStatus = () => {
    const allowChangingOptInStatus = this.config.allowChangingOptInStatus;
    return allowChangingOptInStatus;
  };

  /** Retrieve the opt-in/out notification URL **/
  public getOptInStatusUrl = () => {
    const telemetryOptInStatusUrl = this.config.optInStatusUrl;
    return telemetryOptInStatusUrl;
  };

  /** Retrieve the URL to report telemetry **/
  public getTelemetryUrl = () => {
    const telemetryUrl = this.config.url;
    return telemetryUrl;
  };

  /**
   * Returns if an user should be shown the notice about Opt-In/Out telemetry.
   * The decision is made based on whether any user has already dismissed the message or
   * the user can't actually change the settings (in which case, there's no point on bothering them)
   */
  public getUserShouldSeeOptInNotice(): boolean {
    return (
      (this.config.telemetryNotifyUserAboutOptInDefault && this.config.userCanChangeSettings) ??
      false
    );
  }

  /** Is the user allowed to change the opt-in/out status **/
  public get userCanChangeSettings() {
    return this.config.userCanChangeSettings ?? false;
  }

  /** Change the user's permissions to change the opt-in/out status **/
  public set userCanChangeSettings(userCanChangeSettings: boolean) {
    this.config = { ...this.config, userCanChangeSettings };
  }

  /** Is the cluster opted-in to telemetry **/
  public getIsOptedIn = () => {
    return this.isOptedIn;
  };

  /** Fetches an unencrypted telemetry payload so we can show it to the user **/
  public fetchExample = async () => {
    return await this.fetchTelemetry({ unencrypted: true });
  };

  /**
   * Fetches telemetry payload
   * @param unencrypted Default `false`. Whether the returned payload should be encrypted or not.
   */
  public fetchTelemetry = async ({ unencrypted = false } = {}) => {
    return this.http.post('/api/telemetry/v2/clusters/_stats', {
      body: JSON.stringify({
        unencrypted,
      }),
    });
  };

  /**
   * Overwrite the opt-in status.
   * It will send a final request to the remote telemetry cluster to report about the opt-in/out change.
   * @param optedIn Whether the user is opting-in (`true`) or out (`false`).
   */
  public setOptIn = async (optedIn: boolean): Promise<boolean> => {
    const canChangeOptInStatus = this.getCanChangeOptInStatus();
    if (!canChangeOptInStatus) {
      return false;
    }

    try {
      // Report the option to the Kibana server to store the settings.
      // It returns the encrypted update to send to the telemetry cluster [{cluster_uuid, opt_in_status}]
      const optInPayload = await this.http.post<string[]>('/api/telemetry/v2/optIn', {
        body: JSON.stringify({ enabled: optedIn }),
      });
      if (this.reportOptInStatusChange) {
        // Use the response to report about the change to the remote telemetry cluster.
        // If it's opt-out, this will be the last communication to the remote service.
        await this.reportOptInStatus(optInPayload);
      }
      this.isOptedIn = optedIn;
    } catch (err) {
      this.notifications.toasts.addError(err, {
        title: i18n.translate('telemetry.optInErrorToastTitle', {
          defaultMessage: 'Error',
        }),
        toastMessage: i18n.translate('telemetry.optInErrorToastText', {
          defaultMessage: 'An error occurred while trying to set the usage statistics preference.',
        }),
      });

      return false;
    }

    return true;
  };

  /**
   * Discards the notice about usage collection and stores it so we don't bother any other users.
   */
  public setUserHasSeenNotice = async (): Promise<void> => {
    try {
      await this.http.put('/api/telemetry/v2/userHasSeenNotice');
      this.userHasSeenOptedInNotice = true;
    } catch (error) {
      this.notifications.toasts.addError(error, {
        title: i18n.translate('telemetry.optInNoticeSeenErrorTitle', {
          defaultMessage: 'Error',
        }),
        toastMessage: i18n.translate('telemetry.optInNoticeSeenErrorToastText', {
          defaultMessage: 'An error occurred dismissing the notice',
        }),
      });
      this.userHasSeenOptedInNotice = false;
    }
  };

  /**
   * Pushes the encrypted payload [{cluster_uuid, opt_in_status}] to the remote telemetry service
   * @param optInPayload [{cluster_uuid, opt_in_status}] encrypted by the server into an array of strings
   */
  private reportOptInStatus = async (optInPayload: string[]): Promise<void> => {
    const telemetryOptInStatusUrl = this.getOptInStatusUrl();

    try {
      await fetch(telemetryOptInStatusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Elastic-Stack-Version': this.currentKibanaVersion,
        },
        body: JSON.stringify(optInPayload),
      });
    } catch (err) {
      // Sending the ping is best-effort. Telemetry tries to send the ping once and discards it immediately if sending fails.
      // swallow any errors
    }
  };
}
