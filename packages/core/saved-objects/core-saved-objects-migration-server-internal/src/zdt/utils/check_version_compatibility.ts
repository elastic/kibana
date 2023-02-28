/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import {
  getModelVersionsFromMappings,
  compareModelVersions,
  getModelVersionMapForTypes,
  type IndexMapping,
  type CompareModelVersionResult,
} from '@kbn/core-saved-objects-base-server-internal';

interface CheckVersionCompatibilityOpts {
  mappings: IndexMapping;
  types: SavedObjectsType[];
  source: 'docVersions' | 'mappingVersions';
  deletedTypes: string[];
}

export const checkVersionCompatibility = ({
  mappings,
  types,
  source,
  deletedTypes,
}: CheckVersionCompatibilityOpts): CompareModelVersionResult => {
  const appVersions = getModelVersionMapForTypes(types);
  const indexVersions = getModelVersionsFromMappings({ mappings, source });
  if (!indexVersions) {
    throw new Error(`Cannot check version: ${source} not present in the mapping meta`);
  }
  return compareModelVersions({ appVersions, indexVersions, deletedTypes });
};
