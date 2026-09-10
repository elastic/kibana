/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SourceExistsState } from '../migration_state';
import { assertInvariant, clause } from '../invariant_helper';
import type { IO, UpdateAliasesResponse } from '../io';
import { resetRetry, transitionTo } from '../state';
import { handleRetryableFailure } from '../retry';
import type { Step, SuccessorsOf } from '../types';
import * as REFRESH_SOURCE from './refresh_source';
import * as OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT from './outdated_documents_search_open_pit';
import * as FATAL from './fatal';

export const Name = 'PREPARE_COMPATIBLE_MIGRATION' as const;

export interface State extends SourceExistsState {
  readonly name: typeof Name;
  readonly preTransformDocsActions: import('../../actions').AliasAction[];
  readonly mustRefresh?: boolean;
}

type Successors = SuccessorsOf<typeof Name>;

export const assertInvariants = (state: State): void => {
  assertInvariant(
    state.preTransformDocsActions.length > 0,
    clause(Name, 'preTransformDocsActions must be non-empty')
  );
};

export const step = (state: State, io: IO): Step<Successors, UpdateAliasesResponse> => ({
  action: () => io.updateAliases(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {
        preTransformDocsActions: state.preTransformDocsActions,
        mustRefresh: state.mustRefresh,
      });
    }
    if (response.type === 'success' || response.type === 'alias_not_found_exception') {
      const nextName = state.mustRefresh
        ? REFRESH_SOURCE.Name
        : OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name;
      return transitionTo(resetRetry(state), nextName, {});
    }
    return transitionTo(state, FATAL.Name, { reason: 'Unexpected alias update failure' });
  },
});
