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
