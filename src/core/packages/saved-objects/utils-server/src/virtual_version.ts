/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { gt } from 'semver';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';

/**
 * The major version that is used to represent model versions.
 */
export const modelVersionVirtualMajor = 10;

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
 * Returns the latest registered model version number for the given type.
 */
export const getLatestModelVersion = (type: SavedObjectsType): number => {
  const versionMap =
    typeof type.modelVersions === 'function' ? type.modelVersions() : type.modelVersions ?? {};
  return Object.keys(versionMap).reduce<number>((memo, current) => {
    return Math.max(memo, assertValidModelVersion(current));
  }, 0);
};

/**
 * Returns the latest registered migration version for the given type.
 * @param type the saved object from which we want to retrieve the latest migration version
 * @returns string the latest migration appearing in the migrations property, or 0.0.0 if no migrations defined.
 */
const getLatestMigrationVersion = (type: SavedObjectsType): string => {
  const migrationMap =
    typeof type.migrations === 'function' ? type.migrations() : type.migrations ?? {};
  return Object.keys(migrationMap).reduce<string>((memo, current) => {
    return gt(memo, current) ? memo : current;
  }, '0.0.0');
};

/**
 * Returns the current virtual version for the given type.
 * It will either be:
 * - if the type defines model versions => the latest model version
 * - if the type does NOT define model versions =>
 *   - the initialModelVersion aka 10.0.0 (if useModelVersionsOnly is set to true)
 *   - the latest migration version for the type (if useModelVersionsOnly is set to false)
 *
 * A document written with this version as its `typeMigrationVersion` is treated as already
 * migrated, so callers that build documents in the current shape can use it when importing them.
 */
export const getCurrentVirtualVersion = (
  type: SavedObjectsType,
  useModelVersionsOnly: boolean
): string => {
  if (type.modelVersions || useModelVersionsOnly) {
    const versionNumber = getLatestModelVersion(type);
    return modelVersionToVirtualVersion(versionNumber);
  } else {
    return getLatestMigrationVersion(type);
  }
};
