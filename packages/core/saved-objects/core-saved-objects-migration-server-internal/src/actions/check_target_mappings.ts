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
export interface CheckTargetMappingsParams {
  actualMappings?: IndexMapping;
  expectedMappings: IndexMapping;
}

/** @internal */
export interface TargetMappingsCompareResult {
  match: boolean;
}

export const checkTargetMappings =
  ({
    actualMappings,
    expectedMappings,
  }: CheckTargetMappingsParams): TaskEither.TaskEither<never, TargetMappingsCompareResult> =>
  async () => {
    if (!actualMappings) {
      return Either.right({ match: false });
    }
    const diff = diffMappings(actualMappings, expectedMappings);
    return Either.right({ match: !diff });
  };
