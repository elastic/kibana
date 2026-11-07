/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationContext } from '../context';
import { mergeDocVersions } from '../index_meta';
import type { IO, IOResponse } from '../io';
import type { ExistingIndexState } from '../migration_state';
import { fail, retry } from '../retry';
import { appendLog, resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as DONE from './done';

export const Name = 'UPDATE_DOCUMENT_MODEL_VERSIONS' as const;

/**
 * Records in `_meta.docVersions` that the documents are up to date.
 * Instances waiting for the migration to complete poll for this.
 */
export interface State extends ExistingIndexState {
  readonly controlState: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

const newerVersionsReason = (index: string, types: string[]) =>
  `The ${index} index was updated by a newer version of Kibana during the migration (types: ${types.join(
    ', '
  )}).`;

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'updateIndexMeta'>> => ({
  action: () =>
    io.updateIndexMeta(state.currentIndex, mergeDocVersions(context.typeVirtualVersions)),
  transition: (response): StateOf<Successors> => {
    switch (response.type) {
      case 'retryable_es_client_error':
        return retry(state, response.message, context.maxRetryAttempts);
      case 'incompatible_mapping_exception':
        return fail(state, `Unable to update the _meta of the ${state.currentIndex} index.`);
      case 'newer_model_versions':
        // same policy as INIT: FATAL on classic, leave the index untouched on Serverless
        return context.allowDowngrade
          ? {
              ...appendLog(
                resetRetry(state),
                'info',
                `${newerVersionsReason(state.currentIndex, response.types)} Leaving it untouched.`
              ),
              controlState: DONE.Name,
            }
          : fail(state, newerVersionsReason(state.currentIndex, response.types));
      case 'success':
        return { ...resetRetry(state), controlState: DONE.Name };
      default:
        return assertNever(response);
    }
  },
});
