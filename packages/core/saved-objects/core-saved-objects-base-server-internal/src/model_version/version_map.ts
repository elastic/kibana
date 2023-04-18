/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { assertValidModelVersion } from './conversion';

export type ModelVersionMap = Record<string, number>;

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
 * Build a version map for the given types.
 */
export const getModelVersionMapForTypes = (types: SavedObjectsType[]): ModelVersionMap => {
  return types.reduce<ModelVersionMap>((versionMap, type) => {
    versionMap[type.name] = getLatestModelVersion(type);
    return versionMap;
  }, {});
};
