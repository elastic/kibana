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

import moment from 'moment';
// @ts-ignore
// import { banners, toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';

interface TelemetryServiceConstructor {
  http: CoreStart['http'];
  injectedMetadata: CoreStart['injectedMetadata'];
  notifications: CoreStart['notifications'];
  reportOptInStatusChange?: boolean;
}

export class TelemetryService {
  private readonly http: CoreStart['http'];
  private readonly injectedMetadata: CoreStart['injectedMetadata'];
  private readonly reportOptInStatusChange: boolean;
  private readonly notifications: CoreStart['notifications'];
  private isOptedIn: boolean;

  constructor({
    http,
    injectedMetadata,
    notifications,
    reportOptInStatusChange = true,
  }: TelemetryServiceConstructor) {
    const isOptedIn = injectedMetadata.getInjectedVar('telemetryOptedIn') as boolean;

    this.reportOptInStatusChange = reportOptInStatusChange;
    this.injectedMetadata = injectedMetadata;
    this.notifications = notifications;
    this.http = http;

    this.isOptedIn = isOptedIn;
  }

  public getCanChangeOptInStatus = () => {
    const allowChangingOptInStatus = this.injectedMetadata.getInjectedVar(
      'allowChangingOptInStatus'
    ) as boolean;
    return allowChangingOptInStatus;
  };

  public getOptInStatusUrl = () => {
    const telemetryOptInStatusUrl = this.injectedMetadata.getInjectedVar(
      'telemetryOptInStatusUrl'
    ) as string;
    return telemetryOptInStatusUrl;
  };

  public getTelemetryUrl = () => {
    const telemetryUrl = this.injectedMetadata.getInjectedVar('telemetryUrl') as string;
    return telemetryUrl;
  };

  public getIsOptedIn = () => {
    return this.isOptedIn;
  };

  public fetchExample = async () => {
    return await this.fetchTelemetry({ unencrypted: true });
  };

  public fetchTelemetry = async ({ unencrypted = false } = {}) => {
    const now = moment();
    return this.http.post(`/api/telemetry/v2/clusters/_stats`, {
      body: JSON.stringify({
        unencrypted,
        timeRange: {
          min: now.subtract(20, 'minutes').toISOString(),
          max: now.toISOString(),
        },
      }),
    });
  };

  public setOptIn = async (optedIn: boolean): Promise<boolean> => {
    const canChangeOptInStatus = this.getCanChangeOptInStatus();
    if (!canChangeOptInStatus) {
      return false;
    }

    try {
      await this.http.post('/api/telemetry/v2/optIn', {
        body: JSON.stringify({ enabled: optedIn }),
      });
      if (this.reportOptInStatusChange) {
        await this.reportOptInStatus(optedIn);
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

  private reportOptInStatus = async (OptInStatus: boolean): Promise<void> => {
    const telemetryOptInStatusUrl = this.getOptInStatusUrl();

    try {
      // const optInStatus = await this.http.post('/api/telemetry/v2/clusters/_opt_in_stats', {
      //   body: JSON.stringify({ enabled, unencrypted: false })
      // });

      await fetch(telemetryOptInStatusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: OptInStatus }),
      });
    } catch (err) {
      // Sending the ping is best-effort. Telemetry tries to send the ping once and discards it immediately if sending fails.
      // swallow any errors
    }
  };
}

// export const shouldShowTelemetryOptIn = () => {
//   return (
//     telemetryEnabled &&
//     !telemetryOptInService.getOptIn() &&
//     telemetryOptInService.canChangeOptInStatus()
//   );
// };
