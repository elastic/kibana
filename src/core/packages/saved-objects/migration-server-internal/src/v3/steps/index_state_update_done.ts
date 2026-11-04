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
import type { ExistingIndexState } from '../migration_state';
import { resetRetry, type StateOf } from '../state';
import type { Step, SuccessorsOf } from '../types';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS from './cleanup_unknown_and_excluded_docs';
import * as DONE from './done';

export const Name = 'INDEX_STATE_UPDATE_DONE' as const;

/** The index mappings and aliases are up to date. Documents are handled next, if this node converts them. */
export interface State extends ExistingIndexState {
  readonly controlState: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'noop'>> => ({
  action: io.noop,
  transition: (): StateOf<Successors> =>
    state.convertDocuments
      ? { ...resetRetry(state), controlState: CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS.Name }
      : { ...resetRetry(state), controlState: DONE.Name },
});
