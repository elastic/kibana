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

export class TelemetryService {
  private readonly http: CoreStart['http'];
  private readonly reportOptInStatusChange: boolean;
  private readonly notifications: CoreStart['notifications'];
  private readonly defaultConfig: TelemetryPluginConfig;
  private updatedConfig?: TelemetryPluginConfig;

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

  public set config(updatedConfig: TelemetryPluginConfig) {
    this.updatedConfig = updatedConfig;
  }

  public get config() {
    return { ...this.defaultConfig, ...this.updatedConfig };
  }

  public get isOptedIn() {
    return this.config.optIn;
  }

  public set isOptedIn(optIn) {
    this.config = { ...this.config, optIn };
  }

  public get userHasSeenOptedInNotice() {
    return this.config.telemetryNotifyUserAboutOptInDefault;
  }

  public set userHasSeenOptedInNotice(telemetryNotifyUserAboutOptInDefault) {
    this.config = { ...this.config, telemetryNotifyUserAboutOptInDefault };
  }

  public getCanChangeOptInStatus = () => {
    const allowChangingOptInStatus = this.config.allowChangingOptInStatus;
    return allowChangingOptInStatus;
  };

  public getOptInStatusUrl = () => {
    const telemetryOptInStatusUrl = this.config.optInStatusUrl;
    return telemetryOptInStatusUrl;
  };

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

  public get userCanChangeSettings() {
    return this.config.userCanChangeSettings ?? false;
  }

  public set userCanChangeSettings(userCanChangeSettings: boolean) {
    this.config = { ...this.config, userCanChangeSettings };
  }

  public getIsOptedIn = () => {
    return this.isOptedIn;
  };

  public fetchExample = async () => {
    return await this.fetchTelemetry({ unencrypted: true });
  };

  public fetchTelemetry = async ({ unencrypted = false } = {}) => {
    return this.http.post('/api/telemetry/v2/clusters/_stats', {
      body: JSON.stringify({
        unencrypted,
      }),
    });
  };

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
