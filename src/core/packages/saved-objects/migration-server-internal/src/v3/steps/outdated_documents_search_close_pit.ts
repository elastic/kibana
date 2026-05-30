/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PostInitState } from '../migration_state';
import { assertInvariant, clause } from '../invariant_helper';
import type { IO, ClosePitResponse } from '../io';
import { transitionTo } from '../state';
import { handleRetryableFailure } from '../retry';
import type { Step, SuccessorsOf } from '../types';
import * as OUTDATED_DOCUMENTS_REFRESH from './outdated_documents_refresh';
import * as CHECK_TARGET_MAPPINGS from './check_target_mappings';

export const Name = 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT' as const;

export interface State extends PostInitState {
  readonly name: typeof Name;
  readonly pitId: string;
  readonly hasTransformedDocs: boolean;
}

type Successors = SuccessorsOf<typeof Name>;

export const assertInvariants = (state: State): void => {
  assertInvariant(state.pitId.length > 0, clause(Name, 'pitId required'));
};

export const step = (state: State, io: IO): Step<Successors, ClosePitResponse> => ({
  action: () => io.closePit(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {
        pitId: state.pitId,
        hasTransformedDocs: state.hasTransformedDocs,
      });
    }
    if (state.hasTransformedDocs) {
      return transitionTo(state, OUTDATED_DOCUMENTS_REFRESH.Name, {});
    }
    return transitionTo(state, CHECK_TARGET_MAPPINGS.Name, {});
  },
});
