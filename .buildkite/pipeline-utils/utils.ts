/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const getKibanaDir = (() => {
  let kibanaDir: string | undefined;
  return () => {
    if (!kibanaDir) {
      kibanaDir = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' })
        .toString()
        .trim();
    }

    return kibanaDir;
  };
})();

export interface Version {
  branch: string;
  version: string;
}
export interface VersionsFile {
  versions: Array<
    {
      previousMajor?: boolean;
      previousMinor?: boolean;
      currentMajor?: boolean;
      currentMinor?: boolean;
    } & Version
  >;
}
const getVersionsFile = (() => {
  let versions: VersionsFile & {
    prevMinors: Version[];
    prevMajors: Version[];
    current: Version;
  };
  const versionsFileName = 'versions.json';
  try {
    const versionsJSON = JSON.parse(
      fs.readFileSync(path.join(getKibanaDir(), versionsFileName)).toString()
    );
    versions = {
      versions: versionsJSON.versions,
      prevMinors: versionsJSON.versions.filter((v: any) => v.previousMinor),
      prevMajors: versionsJSON.versions.filter((v: any) => v.previousMajor),
      current: versionsJSON.versions.find((v: any) => v.currentMajor && v.currentMinor),
    };
  } catch (error) {
    throw new Error(`Failed to read ${versionsFileName}: ${error}`);
  }

  return () => versions;
})();

export { getKibanaDir, getVersionsFile };
