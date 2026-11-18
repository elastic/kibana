/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Semver from 'semver';
import { modelVersionVirtualMajor } from '@kbn/core-saved-objects-utils-server';

/**
 * Return true if the given semver version is a virtual model version.
 * Virtual model versions are version which major is the {@link modelVersionVirtualMajor}
 *
 * @example
 * ```
 * isVirtualModelVersion("10.3.0"); // true
 * isVirtualModelVersion("9.7.0);   // false
 * isVirtualModelVersion("10.3.1);  // false
 * ```
 */
export const isVirtualModelVersion = (version: string): boolean => {
  const semver = Semver.parse(version);
  if (!semver) {
    throw new Error(`Invalid semver: ${version}`);
  }
  return _isVirtualModelVersion(semver);
};

/**
 * Converts a virtual model version to its model version.
 *
 *  @example
 *  ```
 *  virtualVersionToModelVersion('10.3.0'); // 3
 *  virtualVersionToModelVersion('9.3.0'); // throw
 *  ```
 */
export const virtualVersionToModelVersion = (virtualVersion: string): number => {
  const semver = Semver.parse(virtualVersion);
  if (!semver) {
    throw new Error(`Invalid semver: ${virtualVersion}`);
  }
  if (!_isVirtualModelVersion(semver)) {
    throw new Error(`Version is not a virtual model version`);
  }
  return semver.minor;
};

export const assertValidVirtualVersion = (virtualVersion: string): string => {
  const semver = Semver.parse(virtualVersion);
  if (!semver) {
    throw new Error('Virtual versions must be valid semver versions');
  }
  return virtualVersion;
};

const _isVirtualModelVersion = (semver: Semver.SemVer): boolean => {
  return semver.major === modelVersionVirtualMajor && semver.patch === 0;
};
