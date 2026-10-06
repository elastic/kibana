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
import type { IO, FetchIndicesResponse } from '../io';
import { resetRetry, transitionTo } from '../state';
import { handleRetryableFailure } from '../retry';
import { getAliases, indexVersion } from '../../model/helpers';
import type { Step, SuccessorsOf } from '../types';
import * as DONE from './done';
import * as FATAL from './fatal';

export const Name = 'MARK_VERSION_INDEX_READY_CONFLICT' as const;

export interface State extends PostInitState {
  readonly name: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, FetchIndicesResponse> => ({
  action: () => io.fetchIndices(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {});
    }
    if (response.type === 'fatal') {
      return transitionTo(state, FATAL.Name, { reason: response.reason });
    }
    const aliasesRes = getAliases(response.indices);
    if (E.isLeft(aliasesRes)) {
      return transitionTo(state, FATAL.Name, {
        reason: `The ${
          aliasesRes.left.alias
        } alias is pointing to multiple indices: ${aliasesRes.left.indices.join(',')}.`,
      });
    }
    const aliases = aliasesRes.right;
    if (
      aliases[state.currentAlias] != null &&
      aliases[state.versionAlias] != null &&
      aliases[state.currentAlias] === aliases[state.versionAlias]
    ) {
      return transitionTo(resetRetry(state), DONE.Name, {});
    }
    const conflictingKibanaVersion =
      indexVersion(aliases[state.currentAlias]) ?? aliases[state.currentAlias];
    return transitionTo(state, FATAL.Name, {
      reason: `Multiple versions of Kibana are attempting a migration in parallel. Another Kibana instance on version ${conflictingKibanaVersion} completed this migration (this instance is running ${state.kibanaVersion}). Ensure that all Kibana instances are running on same version and try again.`,
    });
  },
});
