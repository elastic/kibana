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

import { TelemetrySavedObject } from '../telemetry_repository/get_telemetry_saved_object';

interface MyOpts {
  telemetrySavedObject: TelemetrySavedObject;
  allowChangingOptInStatus: boolean;
  configTelemetryOptIn: boolean;
  telemetryOptedIn: boolean | null;
}

/*
 - telemetrySavedObject, // "notifyUserAboutOptIn" telemetry:telemetry -> true -> dont notify
 - allowChangingOptInStatus, // false -> dont notify
 - configTelemetryOptIn, // true -> notify
 - telemetryOptedIn, // telemetryOptedIn && configTelemetryOptIn = true -> notify
*/
export function getNotifyUserAboutOptInDefault({
  telemetrySavedObject,
  allowChangingOptInStatus,
  configTelemetryOptIn,
  telemetryOptedIn,
}: MyOpts) {
  if (!allowChangingOptInStatus) {
    return false;
  }

  // determine if notice has been seen before

  return telemetryOptedIn && configTelemetryOptIn;
}
