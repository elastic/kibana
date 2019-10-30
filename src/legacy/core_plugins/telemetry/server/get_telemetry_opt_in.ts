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

import { SavedObjectAttributes } from './routes/opt_in';

interface GetTelemetryOptIn {
  request: any;
  currentKibanaVersion: string;
  alwaysOptedIn: boolean;
}

// Returns whether telemetry has been opt'ed into or not.
// Returns null not set, meaning Kibana should prompt in the UI.
export async function getTelemetryOptIn({
  request,
  currentKibanaVersion,
  alwaysOptedIn,
}: GetTelemetryOptIn): Promise<boolean | null> {
  const isRequestingApplication = request.path.startsWith('/app');

  // Prevent interstitial screens (such as the space selector) from prompting for telemetry
  if (!isRequestingApplication) {
    return false;
  }

  if (alwaysOptedIn) {
    return true;
  }

  const savedObjectsClient = request.getSavedObjectsClient();

  let savedObject;
  try {
    savedObject = await savedObjectsClient.get('telemetry', 'telemetry');
  } catch (error) {
    if (savedObjectsClient.errors.isNotFoundError(error)) {
      return null;
    }

    // if we aren't allowed to get the telemetry document, we can assume that we won't
    // be able to opt into telemetry either, so we're returning `false` here instead of null
    if (savedObjectsClient.errors.isForbiddenError(error)) {
      return false;
    }

    throw error;
  }

  const { attributes }: { attributes: SavedObjectAttributes } = savedObject;

  // if enabled is already null, return null
  if (attributes.enabled == null) return null;

  const enabled = !!attributes.enabled;

  // if enabled is true, return it
  if (enabled === true) return enabled;

  // Additional check if they've already opted out (enabled: false):
  // - if the Kibana version has changed by at least a minor version,
  //   return null to re-prompt.

  const lastKibanaVersion = attributes.lastVersionChecked;

  // if the last kibana version isn't set, or is somehow not a string, return null
  if (typeof lastKibanaVersion !== 'string') return null;

  // if version hasn't changed, just return enabled value
  if (lastKibanaVersion === currentKibanaVersion) return enabled;

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
  return enabled;
}

function parseSemver(version: string): semver.SemVer | null {
  // semver functions both return nulls AND throw exceptions: "it depends!"
  try {
    return semver.parse(version);
  } catch (err) {
    return null;
  }
}
