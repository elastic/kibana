/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SemVer } from 'semver';
import type { IndexMapping, IndexMappingMeta } from '../mappings';
import type { VirtualVersionMap } from './version_map';
import { assertValidVirtualVersion } from './conversion';

export interface GetModelVersionsFromMappingsOpts {
  mappings: IndexMapping;
  source: 'mappingVersions' | 'docVersions';
  /** if specified, will filter the types with the provided list */
  knownTypes?: string[];
  minimumVirtualVersion?: string;
}

/**
 * Build the version map from the specified source of the provided mappings.
 */
export const getVirtualVersionsFromMappings = ({
  mappings,
  source,
  knownTypes,
  minimumVirtualVersion,
}: GetModelVersionsFromMappingsOpts): VirtualVersionMap | undefined => {
  if (!mappings._meta) {
    return undefined;
  }

  return getVirtualVersionsFromMappingMeta({
    meta: mappings._meta,
    source,
    knownTypes,
    minimumVirtualVersion,
  });
};

export interface GetModelVersionsFromMappingMetaOpts {
  meta: IndexMappingMeta;
  source: 'mappingVersions' | 'docVersions';
  /** if specified, will filter the types with the provided list */
  knownTypes?: string[];
  minimumVirtualVersion?: string;
}

/**
 * Build the version map from the specified source of the provided mappings meta.
 */
export const getVirtualVersionsFromMappingMeta = ({
  meta,
  source,
  knownTypes,
  minimumVirtualVersion,
}: GetModelVersionsFromMappingMetaOpts): VirtualVersionMap | undefined => {
  const indexVersions = source === 'mappingVersions' ? meta.mappingVersions : meta.docVersions;
  if (!indexVersions) {
    return undefined;
  }

  const minVersion = minimumVirtualVersion ? new SemVer(minimumVirtualVersion) : undefined;
  const typeSet = knownTypes ? new Set(knownTypes) : undefined;

  return Object.entries(indexVersions).reduce<VirtualVersionMap>((map, [type, rawVersion]) => {
    if (!typeSet || typeSet.has(type)) {
      const validatedVersion = assertValidVirtualVersion(rawVersion);
      map[type] =
        minimumVirtualVersion && minVersion!.compare(validatedVersion) === 1
          ? minimumVirtualVersion
          : validatedVersion;
    }
    return map;
  }, {});
};
