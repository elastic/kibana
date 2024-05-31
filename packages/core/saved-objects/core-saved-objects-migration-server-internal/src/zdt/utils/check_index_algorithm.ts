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
 * - `zdt`: last algo that ran was zdt
 *
 * - `v2-compatible`: last running algo was a v2 version that zdt can take over
 *
 * - `v2-incompatible`: last running algo was a v2 version that zdt can not take over
 *
 * - `v2-partially-migrated`: last running algo was zdt taking over v2, but the migration failed at some point
 *
 * - `unknown`: last running algo cannot be determined
 */
export type CheckCurrentAlgorithmResult =
  | 'zdt'
  | 'v2-partially-migrated'
  | 'v2-compatible'
  | 'v2-incompatible'
  | 'unknown';

export const checkIndexCurrentAlgorithm = (
  indexMapping: IndexMapping
): CheckCurrentAlgorithmResult => {
  const meta = indexMapping._meta;
  if (!meta) {
    return 'unknown';
  }

  const hasZDTMeta = !!meta.mappingVersions;
  const hasV2Meta = !!meta.migrationMappingPropertyHashes;

  if (hasZDTMeta) {
    const isFullZdt = !!meta.docVersions;
    return isFullZdt ? 'zdt' : 'v2-partially-migrated';
  }
  if (hasV2Meta) {
    const isCompatible = !!meta.indexTypesMap;
    return isCompatible ? 'v2-compatible' : 'v2-incompatible';
  }

  return 'unknown';
};
