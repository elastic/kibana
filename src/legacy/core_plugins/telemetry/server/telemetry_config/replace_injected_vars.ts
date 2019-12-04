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

import { getTelemetrySavedObject } from '../telemetry_repository';
import { getTelemetryOptIn } from './get_telemetry_opt_in';
import { getTelemetrySendUsageFrom } from './get_telemetry_send_usage_from';
import { getTelemetryAllowChangingOptInStatus } from './get_telemetry_allow_changing_opt_in_status';
import { getNotifyUserAboutOptInDefault } from './get_telemetry_notify_user_about_optin_default';

export async function replaceTelemetryInjectedVars(request: any, server: any) {
  const config = server.config();
  const configTelemetrySendUsageFrom = config.get('telemetry.sendUsageFrom');
  const configTelemetryOptIn = config.get('telemetry.optIn');
  const configTelemetryAllowChangingOptInStatus = config.get('telemetry.allowChangingOptInStatus');
  const isRequestingApplication = request.route.path.startsWith('/app');

  // Prevent interstitial screens (such as the space selector) from prompting for telemetry
  if (!isRequestingApplication) {
    return {
      telemetryOptedIn: false,
    };
  }

  const currentKibanaVersion = config.get('pkg.version');
  const savedObjectsClient = server.savedObjects.getScopedSavedObjectsClient(request);
  const telemetrySavedObject = await getTelemetrySavedObject(savedObjectsClient);
  const allowChangingOptInStatus = getTelemetryAllowChangingOptInStatus({
    configTelemetryAllowChangingOptInStatus,
    telemetrySavedObject,
  });

  const telemetryOptedIn = getTelemetryOptIn({
    configTelemetryOptIn,
    allowChangingOptInStatus,
    telemetrySavedObject,
    currentKibanaVersion,
  });

  const telemetrySendUsageFrom = getTelemetrySendUsageFrom({
    configTelemetrySendUsageFrom,
    telemetrySavedObject,
  });

  const telemetryNotifyUserAboutOptInDefault = getNotifyUserAboutOptInDefault({
    telemetrySavedObject,
    allowChangingOptInStatus,
    configTelemetryOptIn,
    telemetryOptedIn,
  });

  return {
    telemetryOptedIn,
    telemetrySendUsageFrom,
    telemetryNotifyUserAboutOptInDefault,
  };
}
