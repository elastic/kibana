/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationContext } from '../context';
import { mergeMappingVersions } from '../index_meta';
import type { IO, IOResponse } from '../io';
import type { ExistingIndexState } from '../migration_state';
import { fail, retry } from '../retry';
import { appendLog, resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as INDEX_STATE_UPDATE_DONE from './index_state_update_done';
import * as UPDATE_ALIASES from './update_aliases';

export const Name = 'UPDATE_MAPPING_MODEL_VERSIONS' as const;

/** Records in `_meta.mappingVersions` that the index mappings are up to date. */
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
    io.updateIndexMeta(state.currentIndex, mergeMappingVersions(context.typeVirtualVersions)),
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
              controlState: INDEX_STATE_UPDATE_DONE.Name,
              aliasActions: [],
              convertDocuments: false,
            }
          : fail(state, newerVersionsReason(state.currentIndex, response.types));
      case 'success':
        return state.aliasActions.length > 0
          ? { ...resetRetry(state), controlState: UPDATE_ALIASES.Name }
          : { ...resetRetry(state), controlState: INDEX_STATE_UPDATE_DONE.Name };
      default:
        return assertNever(response);
    }
  },
});
