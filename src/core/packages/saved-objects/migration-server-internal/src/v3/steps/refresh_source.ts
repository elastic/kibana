/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SourceExistsState } from '../migration_state';
import type { IO, RefreshSourceResponse } from '../io';
import { resetRetry, transitionTo } from '../state';
import type { Step, SuccessorsOf } from '../types';
import { assertNever } from '../assert_never';
import * as OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT from './outdated_documents_search_open_pit';

export const Name = 'REFRESH_SOURCE' as const;

export interface State extends SourceExistsState {
  readonly name: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, RefreshSourceResponse> => ({
  action: () => io.refreshSource(state),
  transition: (response) => {
    switch (response.type) {
      case 'success':
        return transitionTo(resetRetry(state), OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name, {});
      case 'retryable_failure':
        return transitionTo(state, Name, {});
    }
    return assertNever(response);
  },
});
