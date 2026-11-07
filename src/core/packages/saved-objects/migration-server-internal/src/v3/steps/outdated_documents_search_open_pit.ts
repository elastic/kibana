/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createInitialProgress } from '../../model/progress';
import type { MigrationContext } from '../context';
import type { IO, IOResponse } from '../io';
import type { ExistingIndexState } from '../migration_state';
import { retry } from '../retry';
import { resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as OUTDATED_DOCUMENTS_SEARCH_READ from './outdated_documents_search_read';

export const Name = 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT' as const;

/** Opens a point-in-time to search for outdated documents. */
export interface State extends ExistingIndexState {
  readonly controlState: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'openPit'>> => ({
  action: () => io.openPit(state.currentIndex),
  transition: (response): StateOf<Successors> => {
    switch (response.type) {
      case 'retryable_es_client_error':
        return retry(state, response.message, context.maxRetryAttempts);
      case 'success':
        return {
          ...resetRetry(state),
          controlState: OUTDATED_DOCUMENTS_SEARCH_READ.Name,
          pitId: response.value.pitId,
          lastHitSortValue: undefined,
          batchSize: context.batchSize,
          corruptDocumentIds: [],
          transformErrors: [],
          progress: createInitialProgress(),
          hasTransformedDocs: false,
        };
      default:
        return assertNever(response);
    }
  },
});
