/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as E from 'fp-ts/Either';
import type { PostInitState } from '../migration_state';
import { assertInvariant, clause } from '../invariant_helper';
import type { IO, FetchIndicesResponse } from '../io';
import { resetRetry, transitionTo } from '../state';
import { handleRetryableFailure } from '../retry';
import { getAliases, versionMigrationCompleted } from '../../model/helpers';
import type { Step, SuccessorsOf } from '../types';
import * as WAIT_FOR_MIGRATION_COMPLETION from './wait_for_migration_completion';
import * as DONE from './done';
import * as FATAL from './fatal';

export const Name = 'WAIT_FOR_MIGRATION_COMPLETION' as const;

export interface State extends PostInitState {
  readonly name: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const assertInvariants = (state: State): void => {
  assertInvariant(state.retryDelay > 0, clause(Name, 'retryDelay must be positive while waiting'));
};

export const step = (state: State, io: IO): Step<Successors, FetchIndicesResponse> => ({
  action: () => io.fetchIndices(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure(state, response, { retryDelay: 2000 }, state.retryAttempts);
    }
    if (response.type === 'fatal') {
      return transitionTo(state, FATAL.Name, { reason: response.reason });
    }
    const aliasesRes = getAliases(response.indices);
    if (
      E.isRight(aliasesRes) &&
      versionMigrationCompleted(state.currentAlias, state.versionAlias, aliasesRes.right)
    ) {
      return transitionTo(resetRetry(state), DONE.Name, {});
    }
    return transitionTo(
      {
        ...state,
        retryDelay: 2000,
        logs: [
          ...state.logs,
          {
            level: 'info',
            message: `Migration required. Waiting until another Kibana instance completes the migration.`,
          },
        ],
      },
      WAIT_FOR_MIGRATION_COMPLETION.Name,
      {}
    );
  },
});
