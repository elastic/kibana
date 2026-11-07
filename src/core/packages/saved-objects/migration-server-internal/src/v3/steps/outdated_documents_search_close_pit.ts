/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationContext } from '../context';
import type { IO, IOResponse } from '../io';
import type { PitState } from '../migration_state';
import { retry } from '../retry';
import { resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as OUTDATED_DOCUMENTS_SEARCH_REFRESH from './outdated_documents_search_refresh';
import * as UPDATE_DOCUMENT_MODEL_VERSIONS from './update_document_model_versions';

export const Name = 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT' as const;

/** Closes the point-in-time once all the outdated documents have been converted. */
export interface State extends PitState {
  readonly controlState: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'closePit'>> => ({
  action: () => io.closePit(state.pitId),
  transition: (response): StateOf<Successors> => {
    switch (response.type) {
      case 'retryable_es_client_error':
        return retry(state, response.message, context.maxRetryAttempts);
      case 'success': {
        const { pitId, lastHitSortValue, ...rest } = resetRetry(state);
        return rest.hasTransformedDocs
          ? { ...rest, controlState: OUTDATED_DOCUMENTS_SEARCH_REFRESH.Name }
          : { ...rest, controlState: UPDATE_DOCUMENT_MODEL_VERSIONS.Name };
      }
      default:
        return assertNever(response);
    }
  },
});
