/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Semver from 'semver';
import { modelVersionVirtualMajor } from './constants';

/**
 * Returns the virtual version associated with the given model version
 *
 * @param modelVersion
 */
export const modelVersionToVirtualVersion = (modelVersion: number | string) => {
  const validatedModelVersion = assertValidModelVersion(modelVersion);
  return `${modelVersionVirtualMajor}.${validatedModelVersion}.0`;
};

/**
 * Return true if the given semver version is a virtual model version.
 * Virtual model versions are version which major is the {@link modelVersionVirtualMajor}
 */
export const isVirtualModelVersion = (version: string): boolean => {
  const semver = Semver.parse(version);
  if (!semver) {
    throw new Error(`Invalid semver: ${version}`);
  }
  return _isVirtualModelVersion(semver);
};

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

export const assertValidModelVersion = (modelVersion: string | number): number => {
  if (typeof modelVersion === 'string') {
    modelVersion = parseFloat(modelVersion);
  }
  if (!Number.isInteger(modelVersion)) {
    throw new Error('Model version must be an integer');
  }
  return modelVersion;
};

const _isVirtualModelVersion = (semver: Semver.SemVer): boolean => {
  return semver.major === modelVersionVirtualMajor && semver.patch === 0;
};
