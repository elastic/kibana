/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Option from 'fp-ts/Option';
import { assertInvariant, clause } from '../invariant_helper';
import type { AliasAction } from '../../actions';
import type { PostInitState } from '../migration_state';
import type { IO, MarkVersionIndexReadyResponse } from '../io';
import { resetRetry, transitionTo } from '../state';
import { handleRetryableFailure } from '../retry';
import type { Step, SuccessorsOf } from '../types';
import * as DONE from './done';
import * as MARK_VERSION_INDEX_READY_CONFLICT from './mark_version_index_ready_conflict';

export const Name = 'MARK_VERSION_INDEX_READY' as const;

export interface State extends PostInitState {
  readonly name: typeof Name;
  readonly versionIndexReadyActions: Option.Some<AliasAction[]>;
}

type Successors = SuccessorsOf<typeof Name>;

export const assertInvariants = (state: State): void => {
  // Not type-duplicate: the dispatcher passes `state: State` (broad union where
  // PostInitState declares `Option.Option<...>`), so Option.none can reach here
  // despite this interface declaring `Option.Some`. Guards dispatcher-erasure path.
  assertInvariant(
    Option.isSome(state.versionIndexReadyActions),
    clause(Name, 'versionIndexReadyActions must be Some')
  );
  if (Option.isSome(state.versionIndexReadyActions)) {
    assertInvariant(
      state.versionIndexReadyActions.value.length > 0,
      clause(Name, 'versionIndexReadyActions must be non-empty')
    );
  }
};

export const step = (state: State, io: IO): Step<Successors, MarkVersionIndexReadyResponse> => ({
  action: () => io.updateAliases(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {
        versionIndexReadyActions: state.versionIndexReadyActions,
      });
    }
    if (response.type === 'success' || response.type === 'aliases_updated') {
      return transitionTo(resetRetry(state), DONE.Name, {});
    }
    return transitionTo(state, MARK_VERSION_INDEX_READY_CONFLICT.Name, {});
  },
});
