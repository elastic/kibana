/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import semver, { coerce } from 'semver';

/**
 * Checks for the compatibilitiy between Elasticsearch and Kibana versions
 * 1. Major version differences will never work together.
 * 2. Older versions of ES won't work with newer versions of Kibana.
 */
export function esVersionCompatibleWithKibana(esVersion: string, kibanaVersion: string) {
  const esVersionNumbers = {
    major: semver.major(esVersion),
    minor: semver.minor(esVersion),
    patch: semver.patch(esVersion),
  };

  const kibanaVersionNumbers = {
    major: semver.major(kibanaVersion),
    minor: semver.minor(kibanaVersion),
    patch: semver.patch(kibanaVersion),
  };

  // Reject mismatching major version numbers.
  if (esVersionNumbers.major !== kibanaVersionNumbers.major) {
    return false;
  }

  // Reject older minor versions of ES.
  if (esVersionNumbers.minor < kibanaVersionNumbers.minor) {
    return false;
  }

  return true;
}

export function esVersionEqualsKibana(nodeVersion: string, kibanaVersion: string) {
  const nodeSemVer = coerce(nodeVersion);
  const kibanaSemver = coerce(kibanaVersion);
  return nodeSemVer && kibanaSemver && nodeSemVer.version === kibanaSemver.version;
}
