/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import semver from 'semver';
import { kibanaPackageJson } from '@kbn/utils';

export class EsVersion {
  static getDefault() {
    // example: https://storage.googleapis.com/kibana-ci-es-snapshots-daily/8.0.0/manifest-latest-verified.json
    const manifestUrl = process.env.ES_SNAPSHOT_MANIFEST;
    if (manifestUrl) {
      const match = manifestUrl.match(/\d+\.\d+\.\d+/);
      if (!match) {
        throw new Error('unable to extract es version from ES_SNAPSHOT_MANIFEST_URL');
      }
      return new EsVersion(match[0]);
    }

    return new EsVersion(process.env.TEST_ES_BRANCH || kibanaPackageJson.version);
  }

  public readonly parsed: semver.SemVer;

  constructor(version: string) {
    const parsed = semver.coerce(version);
    if (!parsed) {
      throw new Error(`unable to parse es version [${version}]`);
    }
    this.parsed = parsed;
  }

  toString() {
    return this.parsed.version;
  }

  /**
   * Determine if the ES version matches a semver range, like >=7 or ^8.1.0
   */
  matchRange(range: string) {
    return semver.satisfies(this.parsed, range);
  }

  /**
   * Determine if the ES version matches a specific version, ignores things like -SNAPSHOT
   */
  eql(version: string) {
    const other = semver.coerce(version);
    return other && semver.compareLoose(this.parsed, other) === 0;
  }
}
