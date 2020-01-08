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
import { banners, toastNotifications } from 'ui/notify';
import { npStart } from 'ui/new_platform';
import { i18n } from '@kbn/i18n';

let bannerId: string | null = null;
let optInBannerNoticeId: string | null = null;
let currentOptInStatus = false;
let telemetryNotifyUserAboutOptInDefault = true;

async function sendOptInStatus($injector: any, chrome: any, enabled: boolean) {
  const telemetryOptInStatusUrl = npStart.core.injectedMetadata.getInjectedVar(
    'telemetryOptInStatusUrl'
  ) as string;
  const $http = $injector.get('$http');

  try {
    const optInStatus = await $http.post(
      chrome.addBasePath('/api/telemetry/v2/clusters/_opt_in_stats'),
      {
        enabled,
        unencrypted: false,
      }
    );

    if (optInStatus.data && optInStatus.data.length) {
      return await fetch(telemetryOptInStatusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(optInStatus.data),
      });
    }
  } catch (err) {
    // Sending the ping is best-effort. Telemetry tries to send the ping once and discards it immediately if sending fails.
    // swallow any errors
  }
}
export function TelemetryOptInProvider($injector: any, chrome: any, sendOptInStatusChange = true) {
  currentOptInStatus = npStart.core.injectedMetadata.getInjectedVar('telemetryOptedIn') as boolean;

  const allowChangingOptInStatus = npStart.core.injectedMetadata.getInjectedVar(
    'allowChangingOptInStatus'
  ) as boolean;

  telemetryNotifyUserAboutOptInDefault = npStart.core.injectedMetadata.getInjectedVar(
    'telemetryNotifyUserAboutOptInDefault'
  ) as boolean;

  const provider = {
    getBannerId: () => bannerId,
    getOptInBannerNoticeId: () => optInBannerNoticeId,
    getOptIn: () => currentOptInStatus,
    canChangeOptInStatus: () => allowChangingOptInStatus,
    notifyUserAboutOptInDefault: () => telemetryNotifyUserAboutOptInDefault,
    setBannerId(id: string) {
      bannerId = id;
    },
    setOptInBannerNoticeId(id: string) {
      optInBannerNoticeId = id;
    },
    setOptInNoticeSeen: async () => {
      const $http = $injector.get('$http');

      // If they've seen the notice don't spam the API
      if (!telemetryNotifyUserAboutOptInDefault) {
        return telemetryNotifyUserAboutOptInDefault;
      }

      if (optInBannerNoticeId) {
        banners.remove(optInBannerNoticeId);
      }

      try {
        await $http.put(chrome.addBasePath('/api/telemetry/v2/userHasSeenNotice'));
        telemetryNotifyUserAboutOptInDefault = false;
      } catch (error) {
        toastNotifications.addError(error, {
          title: i18n.translate('telemetry.optInNoticeSeenErrorTitle', {
            defaultMessage: 'Error',
          }),
          toastMessage: i18n.translate('telemetry.optInNoticeSeenErrorToastText', {
            defaultMessage: 'An error occurred dismissing the notice',
          }),
        });
        telemetryNotifyUserAboutOptInDefault = true;
      }

      return telemetryNotifyUserAboutOptInDefault;
    },
    setOptIn: async (enabled: boolean) => {
      if (!allowChangingOptInStatus) {
        return;
      }
      const $http = $injector.get('$http');

      try {
        await $http.post(chrome.addBasePath('/api/telemetry/v2/optIn'), { enabled });
        if (sendOptInStatusChange) {
          await sendOptInStatus($injector, chrome, enabled);
        }
        currentOptInStatus = enabled;
      } catch (error) {
        toastNotifications.addError(error, {
          title: i18n.translate('telemetry.optInErrorToastTitle', {
            defaultMessage: 'Error',
          }),
          toastMessage: i18n.translate('telemetry.optInErrorToastText', {
            defaultMessage:
              'An error occurred while trying to set the usage statistics preference.',
          }),
        });
        return false;
      }

      return true;
    },
    fetchExample: async () => {
      const $http = $injector.get('$http');
      return $http.post(chrome.addBasePath(`/api/telemetry/v2/clusters/_stats`), {
        unencrypted: true,
        timeRange: {
          min: moment()
            .subtract(20, 'minutes')
            .toISOString(),
          max: moment().toISOString(),
        },
      });
    },
  };

  return provider;
}
