/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type SemVer from 'semver/classes/semver';
import semverParse from 'semver/functions/parse';
import type { TelemetrySavedObject } from '../saved_objects';

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

  // If `enabled` is not available in the SO, fall back to the config value.
  const savedOptIn = telemetrySavedObject.enabled ?? configTelemetryOptIn;

  // if the stored value is true, return it
  if (savedOptIn === true) return savedOptIn;

  // Additional check if they've already opted out (enabled: false):
  // - if the Kibana version has changed by at least a minor version,
  //   return null to re-prompt.

  const lastKibanaVersion = telemetrySavedObject.lastVersionChecked;

  // if the last kibana version isn't set, or is somehow not a string, return null
  if (typeof lastKibanaVersion !== 'string') return null;

  // if version hasn't changed, just return the stored value
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

  // current version X.Y is not greater than last version X.Y, return the stored value
  return savedOptIn;
};

function parseSemver(version: string): SemVer | null {
  // semver functions both return nulls AND throw exceptions: "it depends!"
  try {
    return semverParse(version);
  } catch (err) {
    return null;
  }
}
