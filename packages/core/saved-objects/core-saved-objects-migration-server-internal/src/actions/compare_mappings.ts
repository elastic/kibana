/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';

import { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { diffMappings } from '../core/build_active_mappings';

/** @internal */
export interface CompareMappingsParams {
  sourceIndexMappings?: IndexMapping;
  targetIndexMappings: IndexMapping;
}

/** @internal */
export interface SourceMappingsNotFound {
  type: 'source_mappings_not_found_exception';
}

/** @internal */
export interface SourceMappingsCompareResult {
  match: boolean;
}

export const compareMappings =
  ({
    sourceIndexMappings,
    targetIndexMappings,
  }: CompareMappingsParams): TaskEither.TaskEither<
    SourceMappingsNotFound,
    SourceMappingsCompareResult
  > =>
  async () => {
    if (!sourceIndexMappings) {
      return Either.left({ type: 'source_mappings_not_found_exception' as const });
    }
    const diff = diffMappings(sourceIndexMappings, targetIndexMappings);
    return Either.right({ match: !diff });
  };
