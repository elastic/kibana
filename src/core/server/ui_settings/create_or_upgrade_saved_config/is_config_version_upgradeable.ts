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
const rcVersionRegex = /^(\d+\.\d+\.\d+)\-rc(\d+)$/i;

function extractRcNumber(version: string): [string, number] {
  const match = version.match(rcVersionRegex);
  return match ? [match[1], parseInt(match[2], 10)] : [version, Infinity];
}

export function isConfigVersionUpgradeable(savedVersion: string, kibanaVersion: string): boolean {
  if (
    typeof savedVersion !== 'string' ||
    typeof kibanaVersion !== 'string' ||
    savedVersion === kibanaVersion ||
    /alpha|beta|snapshot/i.test(savedVersion)
  ) {
    return false;
  }

  const [savedReleaseVersion, savedRcNumber] = extractRcNumber(savedVersion);
  const [kibanaReleaseVersion, kibanaRcNumber] = extractRcNumber(kibanaVersion);

  // ensure that both release versions are valid, if not then abort
  if (!semver.valid(savedReleaseVersion) || !semver.valid(kibanaReleaseVersion)) {
    return false;
  }

  // ultimately if the saved config is from a previous kibana version
  // or from an earlier rc of the same version, then we can upgrade
  const savedIsLessThanKibana = semver.lt(savedReleaseVersion, kibanaReleaseVersion);
  const savedIsSameAsKibana = semver.eq(savedReleaseVersion, kibanaReleaseVersion);
  const savedRcIsLessThanKibana = savedRcNumber < kibanaRcNumber;
  return savedIsLessThanKibana || (savedIsSameAsKibana && savedRcIsLessThanKibana);
}
