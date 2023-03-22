/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndexMapping, IndexMappingMeta } from '../mappings';
import type { ModelVersionMap } from './version_map';
import { assertValidModelVersion } from './conversion';

export interface GetModelVersionsFromMappingsOpts {
  mappings: IndexMapping;
  source: 'mappingVersions' | 'docVersions';
  /** if specified, will filter the types with the provided list */
  knownTypes?: string[];
}

/**
 * Build the version map from the specified source of the provided mappings.
 */
export const getModelVersionsFromMappings = ({
  mappings,
  source,
  knownTypes,
}: GetModelVersionsFromMappingsOpts): ModelVersionMap | undefined => {
  if (!mappings._meta) {
    return undefined;
  }

  return getModelVersionsFromMappingMeta({
    meta: mappings._meta,
    source,
    knownTypes,
  });
};

export interface GetModelVersionsFromMappingMetaOpts {
  meta: IndexMappingMeta;
  source: 'mappingVersions' | 'docVersions';
  /** if specified, will filter the types with the provided list */
  knownTypes?: string[];
}

/**
 * Build the version map from the specified source of the provided mappings meta.
 */
export const getModelVersionsFromMappingMeta = ({
  meta,
  source,
  knownTypes,
}: GetModelVersionsFromMappingMetaOpts): ModelVersionMap | undefined => {
  const indexVersions = source === 'mappingVersions' ? meta.mappingVersions : meta.docVersions;
  if (!indexVersions) {
    return undefined;
  }
  const typeSet = knownTypes ? new Set(knownTypes) : undefined;

  return Object.entries(indexVersions).reduce<ModelVersionMap>((map, [type, rawVersion]) => {
    if (!typeSet || typeSet.has(type)) {
      map[type] = assertValidModelVersion(rawVersion);
    }
    return map;
  }, {});
};
