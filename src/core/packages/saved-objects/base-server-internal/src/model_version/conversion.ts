/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Semver from 'semver';
import { modelVersionVirtualMajor } from './constants';

/**
 * Returns the virtual version associated with the given model version
 *
 * @example
 * ```
 * modelVersionToVirtualVersion(5); // "10.5.0";
 * modelVersionToVirtualVersion("3"); // "10.3.0";
 * ```
 */
export const modelVersionToVirtualVersion = (modelVersion: number | string) => {
  const validatedModelVersion = assertValidModelVersion(modelVersion);
  return `${modelVersionVirtualMajor}.${validatedModelVersion}.0`;
};

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

/**
 * Asserts the provided number or string is a valid model version, and returns it.
 *
 * A valid model version is a positive integer.
 *
 * @example
 * ```
 * assertValidModelVersion("7"); // 7
 * assertValidModelVersion(4); // 4
 * assertValidModelVersion("foo"); // throw
 * assertValidModelVersion("9.7"); // throw
 * assertValidModelVersion("-3"); // throw
 * ```
 */
export const assertValidModelVersion = (modelVersion: string | number): number => {
  if (typeof modelVersion === 'string') {
    modelVersion = parseFloat(modelVersion);
  }
  if (!Number.isInteger(modelVersion)) {
    throw new Error('Model version must be an integer');
  }
  if (modelVersion < 0) {
    throw new Error('Model version cannot be negative');
  }
  return modelVersion;
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
