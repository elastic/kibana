/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
