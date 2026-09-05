/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PostInitState } from '../migration_state';
import type { IO, OpenPitResponse } from '../io';
import { resetRetry, transitionTo } from '../state';
import { handleRetryableFailure } from '../retry';
import { createInitialProgress } from '../../model/progress';
import type { Step, SuccessorsOf } from '../types';
import * as OUTDATED_DOCUMENTS_SEARCH_READ from './outdated_documents_search_read';

export const Name = 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT' as const;

export interface State extends PostInitState {
  readonly name: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, OpenPitResponse> => ({
  action: () => io.openPit(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {});
    }
    return transitionTo(resetRetry(state), OUTDATED_DOCUMENTS_SEARCH_READ.Name, {
      pitId: response.pitId,
      lastHitSortValue: undefined,
      progress: createInitialProgress(),
      hasTransformedDocs: false,
      corruptDocumentIds: [],
      transformErrors: [],
    });
  },
});
