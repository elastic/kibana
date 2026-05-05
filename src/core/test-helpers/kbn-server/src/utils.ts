/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { valid } from 'semver';

export function nextMinorOf(version: string) {
  // Parse manually (like previousMinorOf) so that pre-release tags such as
  // "-SNAPSHOT" are ignored. semver.inc('9.4.0-SNAPSHOT', 'minor') returns
  // '9.4.0' (the release after the pre-release), not '9.5.0', which would
  // make the computed Kibana version equal to the real ES version and cause
  // the version-mismatch check to silently pass.
  const [major, minor] = version.split('.').map((s) => parseInt(s, 10));
  if (isNaN(major) || isNaN(minor)) {
    throw new Error(`Failed to compute next minor version for ${version}`);
  }
  return `${major}.${minor + 1}.0`;
}

export function previousMinorOf(version: string) {
  const [major, minor] = version.split('.').map((s) => parseInt(s, 10));
  // When minor is already 0 (e.g. 9.0.0), there is no previous minor within the same major.
  // Return the same version so callers can still proceed, even if the test is less meaningful.
  if (minor === 0) {
    return version;
  }
  return `${major}.${minor - 1}.0`;
}

export function resolveKibanaVersion(customKibanaVersion: string | undefined, esVersion: string) {
  if (customKibanaVersion === undefined) {
    return undefined;
  } else if (customKibanaVersion === 'nextMinor') {
    return nextMinorOf(esVersion);
  } else if (customKibanaVersion === 'previousMinor') {
    return previousMinorOf(esVersion);
  } else if (valid(customKibanaVersion)) {
    return customKibanaVersion;
  }
  throw new Error(
    `Invalid customKibanaVersion: "${customKibanaVersion}". Expected a valid semver string or one of: 'nextMinor', 'previousMinor'.`
  );
}
