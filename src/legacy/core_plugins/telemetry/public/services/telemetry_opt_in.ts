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
import { setCanTrackUiMetrics } from 'ui/ui_metric';
import { toastNotifications } from 'ui/notify';
import { npStart } from 'ui/new_platform';
import { i18n } from '@kbn/i18n';

export function TelemetryOptInProvider($injector: any, chrome: any) {
  let currentOptInStatus = npStart.core.injectedMetadata.getInjectedVar(
    'telemetryOptedIn'
  ) as boolean;
  let bannerId: string | null = null;

  setCanTrackUiMetrics(currentOptInStatus);
  const provider = {
    getBannerId: () => bannerId,
    getOptIn: () => currentOptInStatus,
    setBannerId(id: string) {
      bannerId = id;
    },
    setOptIn: async (enabled: boolean) => {
      setCanTrackUiMetrics(enabled);
      const $http = $injector.get('$http');

      try {
        await $http.post(chrome.addBasePath('/api/telemetry/v2/optIn'), { enabled });
        currentOptInStatus = enabled;
      } catch (error) {
        toastNotifications.addError(error, {
          title: i18n.translate('telemetry.optInErrorToastTitle', {
            defaultMessage: 'Error',
          }),
          toastMessage: i18n.translate('telemetry.optInErrorToastText', {
            defaultMessage: 'An error occured while trying to set the usage statistics preference.',
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
