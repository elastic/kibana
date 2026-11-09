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

/**
 * Remote opt-in switch.
 * It applies when opt-in is locked on (`allowChangingOptInStatus === false` and `telemetry.optIn === true`),
 * and when the local choice is still undecided (`null`).
 * A locked opt-out and an unlocked explicit choice are returned as-is.
 */
export const TELEMETRY_OPT_IN_FEATURE_FLAG = 'telemetry.optIn';

interface GetTelemetryOptInConfig {
  telemetrySavedObject: TelemetrySavedObject;
  currentKibanaVersion: string;
  allowChangingOptInStatus: boolean;
  configTelemetryOptIn: boolean | null;
  /**
   * Latest value of {@link TELEMETRY_OPT_IN_FEATURE_FLAG}.
   * `undefined` until the first evaluation.
   */
  isOptedInFromFeatureFlag: boolean | undefined;
}

type GetTelemetryOptIn = (config: GetTelemetryOptInConfig) => boolean | null;

/** Resolves telemetry opt-in from local state, then the feature flag where that flag is allowed to apply. */
export const getTelemetryOptIn: GetTelemetryOptIn = ({
  isOptedInFromFeatureFlag,
  allowChangingOptInStatus,
  configTelemetryOptIn,
  ...options
}) => {
  // Locked on: the feature flag can turn collection off. Stay undecided until the flag is known.
  if (allowChangingOptInStatus === false && configTelemetryOptIn === true) {
    return isOptedInFromFeatureFlag ?? null;
  }

  const localOptIn = getTelemetryOptInFromLocalState({
    allowChangingOptInStatus,
    configTelemetryOptIn,
    ...options,
  });

  // An unlocked explicit choice, and a locked opt-out, win over the feature flag.
  if (typeof localOptIn === 'boolean') {
    return localOptIn;
  }

  // Undecided: a disabled flag opts out without prompting. An enabled or unknown flag keeps `null`
  // so the UI can still ask for a choice.
  return isOptedInFromFeatureFlag === false ? false : null;
};

const getTelemetryOptInFromLocalState = ({
  telemetrySavedObject,
  currentKibanaVersion,
  allowChangingOptInStatus,
  configTelemetryOptIn,
}: Omit<GetTelemetryOptInConfig, 'isOptedInFromFeatureFlag'>): boolean | null => {
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
