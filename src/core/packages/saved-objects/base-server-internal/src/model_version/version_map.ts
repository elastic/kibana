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
import { assertValidModelVersion, modelVersionToVirtualVersion } from './conversion';

/**
 * Represents the virtual version of a given SO type.
 * The virtual version is a compatibility format between the old
 * migration system's versioning, based on the stack version, and the new model versioning.
 *
 * A virtual version is a plain semver version. Depending on its major version value, the
 * underlying version can be the following:
 * - Major < 10: Old migrations system (stack versions), using the equivalent value (e.g `8.7.0` => migration version `8.7.0`)
 * - Major == 10: Model versions, using the `10.{modelVersion}.0` format (e.g `10.3.0` => model version 3)
 */
export type VirtualVersion = string;

/**
 * A map of SO type name to Model Version.
 */
export type ModelVersionMap = Record<string, number>;

/**
 * A map of SO type name to {@link VirtualVersion}.
 */
export type VirtualVersionMap = Record<string, VirtualVersion>;

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
export const getLatestMigrationVersion = (type: SavedObjectsType): string => {
  const migrationMap =
    typeof type.migrations === 'function' ? type.migrations() : type.migrations ?? {};
  return Object.keys(migrationMap).reduce<string>((memo, current) => {
    return gt(memo, current) ? memo : current;
  }, '0.0.0');
};

/**
 * Build a version map for the given types.
 */
export const getModelVersionMapForTypes = (types: SavedObjectsType[]): ModelVersionMap => {
  return types.reduce<ModelVersionMap>((versionMap, type) => {
    versionMap[type.name] = getLatestModelVersion(type);
    return versionMap;
  }, {});
};

/**
 * Returns the current virtual version for the given type.
 * It will either be:
 * - if the type defines model versions => the latest model version
 * - if the type does NOT define model versions =>
 *   - the initialModelVersion aka 10.0.0 (if useModelVersionsOnly is set to true)
 *   - the latest migration version for the type (if useModelVersionsOnly is set to false)
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

export interface GetVirtualVersionMapParams {
  types: SavedObjectsType[];
  useModelVersionsOnly: boolean;
}

/**
 * Returns a map of virtual model version for the given types.
 * See {@link getCurrentVirtualVersion}
 */
export const getVirtualVersionMap = ({
  types,
  useModelVersionsOnly,
}: GetVirtualVersionMapParams): VirtualVersionMap => {
  return types.reduce<VirtualVersionMap>((versionMap, type) => {
    versionMap[type.name] = getCurrentVirtualVersion(type, useModelVersionsOnly);
    return versionMap;
  }, {});
};

/**
 * Returns the latest version number that includes changes in the mappings, for the given type.
 * If none of the versions are updating the mappings, it will return 0
 */
export const getLatestMappingsVersionNumber = (type: SavedObjectsType): number => {
  const versionMap =
    typeof type.modelVersions === 'function' ? type.modelVersions() : type.modelVersions ?? {};
  return Object.entries(versionMap)
    .filter(([version, info]) =>
      info.changes?.some((change) => change.type === 'mappings_addition')
    )
    .reduce<number>((memo, [current]) => {
      return Math.max(memo, assertValidModelVersion(current));
    }, 0);
};

/**
 * Returns the latest model version that includes changes in the mappings, for the given type.
 * It will either be a model version or the latest migration version
 * if no changed were introduced after enforcing the switch to model versions.
 */
export const getLatestMappingsModelVersion = (type: SavedObjectsType): string => {
  const modelVersion = getLatestMappingsVersionNumber(type);
  return modelVersionToVirtualVersion(modelVersion);
};

/**
 * Returns a map of virtual model version for the given types.
 * See {@link getLatestMappingsModelVersion}
 */
export const getLatestMappingsVirtualVersionMap = (
  types: SavedObjectsType[]
): VirtualVersionMap => {
  return types.reduce<VirtualVersionMap>((versionMap, type) => {
    versionMap[type.name] = getLatestMappingsModelVersion(type);
    return versionMap;
  }, {});
};
