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

const bannerId: string | null = null;
const optInBannerNoticeId: string | null = null;
const currentOptInStatus = false;
const telemetryNotifyUserAboutOptInDefault = true;

interface TelemetryServiceConstructor {
  http: CoreStart['http'];
  injectedMetadata: CoreStart['injectedMetadata'];
  reportOptInStatusChange?: boolean;
}

export class TelemetryService {
  private readonly http: CoreStart['http'];
  private readonly injectedMetadata: CoreStart['injectedMetadata'];
  private readonly reportOptInStatusChange: boolean;
  private isOptedIn: boolean;

  constructor({
    http,
    injectedMetadata,
    reportOptInStatusChange = true,
  }: TelemetryServiceConstructor) {
    const isOptedIn = injectedMetadata.getInjectedVar('telemetryOptedIn') as boolean;

    this.reportOptInStatusChange = reportOptInStatusChange;
    this.injectedMetadata = injectedMetadata;
    this.http = http;

    this.isOptedIn = isOptedIn;
  }

  public getCanChangeOptInStatus() {
    const allowChangingOptInStatus = this.injectedMetadata.getInjectedVar(
      'allowChangingOptInStatus'
    ) as boolean;
    return allowChangingOptInStatus;
  }

  public getOptInStatusUrl() {
    const telemetryOptInStatusUrl = this.injectedMetadata.getInjectedVar(
      'telemetryOptInStatusUrl'
    ) as string;
    return telemetryOptInStatusUrl;
  }

  public getTelemetryUrl() {
    const telemetryUrl = this.injectedMetadata.getInjectedVar('telemetryUrl') as string;
    return telemetryUrl;
  }

  public getIsOptedIn() {
    return this.isOptedIn;
  }

  public async fetchTelemetry({ unencrypted = false } = {}) {
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
  }

  public async setOptIn(optedIn: boolean): Promise<boolean> {
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
      toastNotifications.addError(err, {
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
  }

  private async reportOptInStatus(OptInStatus: boolean) {
    const telemetryOptInStatusUrl = this.getOptInStatusUrl();

    try {
      // const optInStatus = await this.http.post('/api/telemetry/v2/clusters/_opt_in_stats', {
      //   body: JSON.stringify({ enabled, unencrypted: false })
      // });

      return await fetch(telemetryOptInStatusUrl, {
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
  }
}

// getBannerId: () => bannerId,
//     getOptInBannerNoticeId: () => optInBannerNoticeId,
//     getOptIn: () => currentOptInStatus,
//     canChangeOptInStatus: () => allowChangingOptInStatus,
//     notifyUserAboutOptInDefault: () => telemetryNotifyUserAboutOptInDefault,
//     setBannerId(id: string) {
//       bannerId = id;
//     },
//     setOptInBannerNoticeId(id: string) {
//       optInBannerNoticeId = id;
//     },
//     setOptInNoticeSeen: async () => {
//       const $http = $injector.get('$http');

//       // If they've seen the notice don't spam the API
//       if (!telemetryNotifyUserAboutOptInDefault) {
//         return telemetryNotifyUserAboutOptInDefault;
//       }

//       if (optInBannerNoticeId) {
//         banners.remove(optInBannerNoticeId);
//       }

//       try {
//         await $http.put(chrome.addBasePath('/api/telemetry/v2/userHasSeenNotice'));
//         telemetryNotifyUserAboutOptInDefault = false;
//       } catch (error) {
//         toastNotifications.addError(error, {
//           title: i18n.translate('telemetry.optInNoticeSeenErrorTitle', {
//             defaultMessage: 'Error',
//           }),
//           toastMessage: i18n.translate('telemetry.optInNoticeSeenErrorToastText', {
//             defaultMessage: 'An error occurred dismissing the notice',
//           }),
//         });
//         telemetryNotifyUserAboutOptInDefault = true;
//       }

//       return telemetryNotifyUserAboutOptInDefault;
//     },
//   };
