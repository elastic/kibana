/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Option from 'fp-ts/Option';
import type { PostInitState } from '../migration_state';
import type { IO, NoopResponse } from '../io';
import { transitionTo } from '../state';
import type { Step, SuccessorsOf } from '../types';
import * as DONE from './done';
import * as MARK_VERSION_INDEX_READY from './mark_version_index_ready';

export const Name = 'CHECK_VERSION_INDEX_READY_ACTIONS' as const;

export interface State extends PostInitState {
  readonly name: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, NoopResponse> => ({
  action: () => io.noop(),
  transition: (response) => {
    switch (response.type) {
      case 'noop':
        if (Option.isSome(state.versionIndexReadyActions)) {
          return transitionTo(state, MARK_VERSION_INDEX_READY.Name, {
            versionIndexReadyActions: state.versionIndexReadyActions,
          });
        }
        return transitionTo(state, DONE.Name, {});
    }
  },
});
