/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CreateTargetResponse, IO } from '../io';
import { appendLog, incrementRetry, resetRetry, transitionTo, type BaseState } from '../state';
import type { Step, SuccessorsOf } from '../types';
import * as FATAL from './fatal';
import * as MARK_READY from './mark_ready';

export const Name = 'CREATE_TARGET' as const;

export interface State extends BaseState {
  readonly name: typeof Name;
  readonly sourceIndex: string;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, CreateTargetResponse> => ({
  action: () => io.createTarget(state.sourceIndex),
  transition: (response) => {
    if (response.type === 'target_created') {
      return transitionTo(
        resetRetry(appendLog(state, `v3 CREATE_TARGET created ${response.targetIndex}`)),
        MARK_READY.Name,
        { targetIndex: response.targetIndex }
      );
    }

    if (response.type === 'fatal_failure') {
      return transitionTo(
        appendLog(state, `v3 CREATE_TARGET failed: ${response.reason}`),
        FATAL.Name,
        { reason: response.reason }
      );
    }

    if (state.retryCount >= state.retryAttempts) {
      return transitionTo(
        appendLog(state, `v3 CREATE_TARGET exhausted retries: ${response.message}`),
        FATAL.Name,
        { reason: response.message }
      );
    }

    return transitionTo(
      incrementRetry(appendLog(state, `v3 CREATE_TARGET retrying: ${response.message}`)),
      Name,
      { sourceIndex: state.sourceIndex }
    );
  },
});
