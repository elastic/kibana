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

export interface RootFieldsChanged {
  type: 'root_fields_changed';
  updatedFields: string[];
}

export interface TypesChanged {
  type: 'types_changed';
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
    IndexMappingsIncomplete | RootFieldsChanged | TypesChanged,
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

    if (updatedFields.length) {
      return Either.left({
        type: 'root_fields_changed',
        updatedFields,
      });
    }

    const updatedTypes = getUpdatedTypes({
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
    } else {
      return Either.right({ type: 'compared_mappings_match' as const });
    }
  };
