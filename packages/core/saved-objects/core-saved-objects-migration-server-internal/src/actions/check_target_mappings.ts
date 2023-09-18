/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';

import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { getUpdatedHashes } from '../core/build_active_mappings';

/** @internal */
export interface CheckTargetMappingsParams {
  actualMappings?: IndexMapping;
  expectedMappings: IndexMapping;
}

/** @internal */
export interface ComparedMappingsMatch {
  type: 'compared_mappings_match';
}

export interface ActualMappingsIncomplete {
  type: 'actual_mappings_incomplete';
}

export interface ComparedMappingsChanged {
  type: 'compared_mappings_changed';
  updatedHashes: string[];
}

export const checkTargetMappings =
  ({
    actualMappings,
    expectedMappings,
  }: CheckTargetMappingsParams): TaskEither.TaskEither<
    ActualMappingsIncomplete | ComparedMappingsChanged,
    ComparedMappingsMatch
  > =>
  async () => {
    if (
      !actualMappings?._meta?.migrationMappingPropertyHashes ||
      actualMappings.dynamic !== expectedMappings.dynamic
    ) {
      return Either.left({ type: 'actual_mappings_incomplete' as const });
    }

    const updatedHashes = getUpdatedHashes({
      actual: actualMappings,
      expected: expectedMappings,
    });

    if (updatedHashes.length) {
      return Either.left({
        type: 'compared_mappings_changed' as const,
        updatedHashes,
      });
    } else {
      return Either.right({ type: 'compared_mappings_match' as const });
    }
  };
