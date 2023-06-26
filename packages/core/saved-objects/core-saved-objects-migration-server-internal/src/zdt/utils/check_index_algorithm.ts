/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';

/**
 * The list of values returned by `checkIndexCurrentAlgorithm`.
 *
 * - `zdt`
 * - `v2-compatible`
 * - `v2-incompatible`
 * - `unknown`
 */
export type CheckCurrentAlgorithmResult = 'zdt' | 'v2-compatible' | 'v2-incompatible' | 'unknown';

export const checkIndexCurrentAlgorithm = (
  indexMapping: IndexMapping
): CheckCurrentAlgorithmResult => {
  const meta = indexMapping._meta;
  if (!meta) {
    return 'unknown';
  }

  const hasV2Meta = !!meta.migrationMappingPropertyHashes;
  const hasZDTMeta = !!meta.docVersions || !!meta.mappingVersions;

  if (hasV2Meta && hasZDTMeta) {
    return 'unknown';
  }
  if (hasV2Meta) {
    const isCompatible = !!meta.indexTypesMap;
    return isCompatible ? 'v2-compatible' : 'v2-incompatible';
  }
  if (hasZDTMeta) {
    return 'zdt';
  }
  return 'unknown';
};
