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
import { type Aliases, versionMigrationCompleted } from '../model/helpers';
import type { RetryableEsClientError } from './catch_retryable_es_client_errors';
import { updateMappings } from './update_mappings';
import type { IncompatibleMappingException } from './update_mappings';

/** @internal */
export interface UpdateSourceMappingsPropertiesParams {
  client: ElasticsearchClient;
  aliases: Aliases;
  currentAlias: string;
  versionAlias: string;
  sourceIndex: string;
  sourceMappings: IndexMapping;
  targetMappings: IndexMapping;
}

/** @internal */
export enum UpdateSourceMappingsPropertiesResult {
  Compatible = 'compatible',
  Updated = 'updated',
  Incompatible = 'incompatible',
}

/**
 * This action performs the following operations:
 *   - Checks the source mappings for any changes.
 *   - If there are no changes and the version migration is completed, it returns `Updated`.
 *   - If there are no changes and the version migration is incomplete, it returns `Compatible`.
 *   - If there are changes it tries to patch the source mappings.
 *   - If the patch is successful and the version migration is completed, it returns `Updated`.
 *   - If the patch is successful and the version migration is incomplete, it returns `Compatible`.
 *   - If the patch is unsuccessful and the version migration is incomplete, it returns `Incompatible`.
 *   - If the patch is unsuccessful and the version migration is completed, it returns an error. It is likely an incompatible change caused by the newly enabled plugin or code change.
 */
export const updateSourceMappingsProperties = ({
  client,
  aliases,
  currentAlias,
  versionAlias,
  sourceIndex,
  sourceMappings,
  targetMappings,
}: UpdateSourceMappingsPropertiesParams): TaskEither.TaskEither<
  RetryableEsClientError | IncompatibleMappingException,
  UpdateSourceMappingsPropertiesResult
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
    ),
    TaskEither.orElse((error) =>
      error.type === 'incompatible_mapping_exception'
        ? TaskEither.right('update_mappings_failed' as const)
        : TaskEither.left(error)
    ),
    TaskEither.chainW((status) => {
      const isUpdated = status === 'update_mappings_succeeded';
      const isCompleted = versionMigrationCompleted(currentAlias, versionAlias, aliases);

      if (isUpdated && isCompleted) {
        return TaskEither.right(UpdateSourceMappingsPropertiesResult.Updated);
      }

      if (isUpdated && !isCompleted) {
        return TaskEither.right(UpdateSourceMappingsPropertiesResult.Compatible);
      }

      if (!isUpdated && !isCompleted) {
        return TaskEither.right(UpdateSourceMappingsPropertiesResult.Incompatible);
      }

      return TaskEither.left({
        type: 'incompatible_mapping_exception' as const,
      });
    })
  );
};
