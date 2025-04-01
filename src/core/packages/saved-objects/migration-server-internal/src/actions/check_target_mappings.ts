/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';

import type { IndexMapping, VirtualVersionMap } from '@kbn/core-saved-objects-base-server-internal';
import { getNewAndUpdatedTypes } from '../core/compare_mappings';

/** @internal */
export interface CheckTargetTypesMappingsParams {
  indexTypes: string[];
  indexMappings?: IndexMapping;
  appMappings: IndexMapping;
  latestMappingsVersions: VirtualVersionMap;
  hashToVersionMap?: Record<string, string>;
}

/** @internal */
export interface IndexMappingsIncomplete {
  type: 'index_mappings_incomplete';
}

/** @internal */
export interface TypesMatch {
  type: 'types_match';
}

/** @internal */
export interface TypesChanged {
  type: 'types_changed';
  updatedTypes: string[];
}

/** @internal */
export interface TypesAdded {
  type: 'types_added';
  newTypes: string[];
}

export const checkTargetTypesMappings =
  ({
    indexTypes,
    indexMappings,
    appMappings,
    latestMappingsVersions,
    hashToVersionMap = {},
  }: CheckTargetTypesMappingsParams): TaskEither.TaskEither<
    IndexMappingsIncomplete | TypesChanged | TypesAdded,
    TypesMatch
  > =>
  async () => {
    if (
      (!indexMappings?._meta?.migrationMappingPropertyHashes &&
        !indexMappings?._meta?.mappingVersions) ||
      indexMappings.dynamic !== appMappings.dynamic
    ) {
      return Either.left({ type: 'index_mappings_incomplete' as const });
    }

    const { newTypes, updatedTypes } = getNewAndUpdatedTypes({
      indexTypes,
      indexMeta: indexMappings?._meta,
      latestMappingsVersions,
      hashToVersionMap,
    });

    if (updatedTypes.length) {
      return Either.left({
        type: 'types_changed' as const,
        updatedTypes,
      });
    } else if (newTypes.length) {
      return Either.left({
        type: 'types_added' as const,
        newTypes,
      });
    } else {
      return Either.right({ type: 'types_match' as const });
    }
  };
