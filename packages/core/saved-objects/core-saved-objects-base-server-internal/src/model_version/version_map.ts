/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Semver from 'semver';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { assertValidModelVersion, modelVersionToVirtualVersion } from './conversion';

export type ModelVersionMap = Record<string, number>;
export type VirtualVersion = string;
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

export const getLatestMigrationVersion = (type: SavedObjectsType): string => {
  const migrationMap =
    typeof type.migrations === 'function' ? type.migrations() : type.migrations ?? {};
  return Object.keys(migrationMap).reduce<string>((memo, current) => {
    return Semver.gt(memo, current) ? memo : current;
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
 * If will either be the latest model version if the type
 * already switched to using them (switchToModelVersionAt is set),
 * or the latest migration version for the type otherwise.
 */
export const getCurrentVirtualVersion = (type: SavedObjectsType): string => {
  if (type.switchToModelVersionAt) {
    const modelVersion = getLatestModelVersion(type);
    return modelVersionToVirtualVersion(modelVersion);
  } else {
    return getLatestMigrationVersion(type);
  }
};

/**
 * Returns a map of virtual model version for the given types.
 * See {@link getCurrentVirtualVersion}
 */
export const getVirtualVersionMap = (types: SavedObjectsType[]): VirtualVersionMap => {
  return types.reduce<VirtualVersionMap>((versionMap, type) => {
    versionMap[type.name] = getCurrentVirtualVersion(type);
    return versionMap;
  }, {});
};
