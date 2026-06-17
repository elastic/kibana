/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PostInitState } from '../migration_state';
import type { IO, RefreshSourceResponse } from '../io';
import { resetRetry, transitionTo } from '../state';
import type { Step, SuccessorsOf } from '../types';
import { assertNever } from '../assert_never';
import * as CHECK_TARGET_MAPPINGS from './check_target_mappings';

export const Name = 'OUTDATED_DOCUMENTS_REFRESH' as const;

export interface State extends PostInitState {
  readonly name: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, RefreshSourceResponse> => ({
  action: () => io.refreshTarget(state),
  transition: (response) => {
    switch (response.type) {
      case 'success':
        return transitionTo(resetRetry(state), CHECK_TARGET_MAPPINGS.Name, {});
      case 'retryable_failure':
        return transitionTo(state, Name, {});
    }
    return assertNever(response);
  },
});
