/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';

import type { IndexMapping, VirtualVersionMap } from '@kbn/core-saved-objects-base-server-internal';
import { getUpdatedRootFields, getUpdatedTypes } from '../core/compare_mappings';

/** @internal */
export interface CheckTargetMappingsParams {
  indexTypes: string[];
  indexMappings?: IndexMapping;
  appMappings: IndexMapping;
  latestMappingsVersions: VirtualVersionMap;
  hashToVersionMap?: Record<string, string>;
}

/** @internal */
export interface ComparedMappingsMatch {
  type: 'compared_mappings_match';
}

export interface IndexMappingsIncomplete {
  type: 'index_mappings_incomplete';
}

export interface MappingsChanged {
  type: 'mappings_changed';
  updatedFields: string[];
  updatedTypes: string[];
}

export const checkTargetMappings =
  ({
    indexTypes,
    indexMappings,
    appMappings,
    latestMappingsVersions,
    hashToVersionMap = {},
  }: CheckTargetMappingsParams): TaskEither.TaskEither<
    IndexMappingsIncomplete | MappingsChanged,
    ComparedMappingsMatch
  > =>
  async () => {
    if (
      (!indexMappings?._meta?.migrationMappingPropertyHashes &&
        !indexMappings?._meta?.mappingVersions) ||
      indexMappings.dynamic !== appMappings.dynamic
    ) {
      return Either.left({ type: 'index_mappings_incomplete' as const });
    }

    const updatedFields = getUpdatedRootFields(indexMappings);
    const updatedTypes = getUpdatedTypes({
      indexTypes,
      indexMeta: indexMappings?._meta,
      latestMappingsVersions,
      hashToVersionMap,
    });

    if (updatedFields.length || updatedTypes.length) {
      return Either.left({
        type: 'mappings_changed' as const,
        updatedFields,
        updatedTypes,
      });
    } else {
      return Either.right({ type: 'compared_mappings_match' as const });
    }
  };
