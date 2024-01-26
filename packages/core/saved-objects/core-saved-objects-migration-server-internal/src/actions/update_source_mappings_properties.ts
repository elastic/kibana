/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/lib/pipeable';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { diffMappings } from '../core/build_active_mappings';
import type { RetryableEsClientError } from './catch_retryable_es_client_errors';
import { updateMappings } from './update_mappings';
import type { IncompatibleMappingException } from './update_mappings';

/** @internal */
export interface UpdateSourceMappingsPropertiesParams {
  client: ElasticsearchClient;
  sourceIndex: string;
  sourceMappings: IndexMapping;
  targetMappings: IndexMapping;
}

/**
 * This action tries to update the source mappings properties if there are any changes.
 * @internal
 */
export const updateSourceMappingsProperties = ({
  client,
  sourceIndex,
  sourceMappings,
  targetMappings,
}: UpdateSourceMappingsPropertiesParams): TaskEither.TaskEither<
  RetryableEsClientError | IncompatibleMappingException,
  'update_mappings_succeeded'
> => {
  return pipe(
    diffMappings(sourceMappings, targetMappings),
    TaskEither.fromPredicate(
      (changes) => !!changes,
      () => 'update_mappings_succeeded' as const
    ),
    TaskEither.swap,
    TaskEither.orElse(() =>
      updateMappings({
        client,
        index: sourceIndex,
        mappings: omit(targetMappings, ['_meta']), // ._meta property will be updated on a later step
      })
    )
  );
};
