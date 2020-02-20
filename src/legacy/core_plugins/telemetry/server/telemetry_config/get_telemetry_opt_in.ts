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

import semver from 'semver';
import { TelemetrySavedObject } from '../telemetry_repository/get_telemetry_saved_object';

interface GetTelemetryOptInConfig {
  telemetrySavedObject: TelemetrySavedObject;
  currentKibanaVersion: string;
  allowChangingOptInStatus: boolean;
  configTelemetryOptIn: boolean | null;
}

type GetTelemetryOptIn = (config: GetTelemetryOptInConfig) => null | boolean;

export const getTelemetryOptIn: GetTelemetryOptIn = ({
  telemetrySavedObject,
  currentKibanaVersion,
  allowChangingOptInStatus,
  configTelemetryOptIn,
}) => {
  if (typeof configTelemetryOptIn === 'boolean' && !allowChangingOptInStatus) {
    return configTelemetryOptIn;
  }

  if (telemetrySavedObject === false) {
    return false;
  }

  if (telemetrySavedObject === null || typeof telemetrySavedObject.enabled !== 'boolean') {
    return configTelemetryOptIn;
  }

  const savedOptIn = telemetrySavedObject.enabled;

  // if enabled is true, return it
  if (savedOptIn === true) return savedOptIn;

  // Additional check if they've already opted out (enabled: false):
  // - if the Kibana version has changed by at least a minor version,
  //   return null to re-prompt.

  const lastKibanaVersion = telemetrySavedObject.lastVersionChecked;

  // if the last kibana version isn't set, or is somehow not a string, return null
  if (typeof lastKibanaVersion !== 'string') return null;

  // if version hasn't changed, just return enabled value
  if (lastKibanaVersion === currentKibanaVersion) return savedOptIn;

  const lastSemver = parseSemver(lastKibanaVersion);
  const currentSemver = parseSemver(currentKibanaVersion);

  // if either version is invalid, return null
  if (lastSemver == null || currentSemver == null) return null;

  // actual major/minor version comparison, for cases when to return null
  if (currentSemver.major > lastSemver.major) return null;
  if (currentSemver.major === lastSemver.major) {
    if (currentSemver.minor > lastSemver.minor) return null;
  }

  // current version X.Y is not greater than last version X.Y, return enabled
  return savedOptIn;
};

function parseSemver(version: string): semver.SemVer | null {
  // semver functions both return nulls AND throw exceptions: "it depends!"
  try {
    return semver.parse(version);
  } catch (err) {
    return null;
  }
}
