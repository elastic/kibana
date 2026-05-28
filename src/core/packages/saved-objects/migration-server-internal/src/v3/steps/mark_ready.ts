/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IO, MarkReadyResponse } from '../io';
import { appendLog, resetRetry, transitionTo, type BaseState } from '../state';
import type { Step, SuccessorsOf } from '../types';
import { assertNever } from '../assert_never';
import * as DONE from './done';
import * as FATAL from './fatal';

export const Name = 'MARK_READY' as const;

export interface State extends BaseState {
  readonly name: typeof Name;
  readonly targetIndex: string;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, MarkReadyResponse> => ({
  action: () => io.markReady(state.targetIndex),
  transition: (response) => {
    switch (response.type) {
      case 'ready':
        return transitionTo(
          resetRetry(appendLog(state, `v3 MARK_READY completed ${state.targetIndex}`)),
          DONE.Name,
          { targetIndex: state.targetIndex }
        );
      case 'fatal_failure':
        return transitionTo(
          appendLog(state, `v3 MARK_READY failed: ${response.reason}`),
          FATAL.Name,
          {
            reason: response.reason,
          }
        );
      default:
        return assertNever(response);
    }
  },
});
