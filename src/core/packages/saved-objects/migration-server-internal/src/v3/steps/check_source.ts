/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CheckSourceResponse, IO } from '../io';
import { appendLog, resetRetry, transitionTo, type BaseState } from '../state';
import type { Step, SuccessorsOf } from '../types';
import { assertNever } from '../assert_never';
import * as CREATE_TARGET from './create_target';
import * as FATAL from './fatal';

export const Name = 'CHECK_SOURCE' as const;

export interface State extends BaseState {
  readonly name: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, CheckSourceResponse> => ({
  action: () => io.checkSource(),
  transition: (response) => {
    switch (response.type) {
      case 'source_found':
        return transitionTo(
          resetRetry(appendLog(state, `v3 CHECK_SOURCE found ${response.sourceIndex}`)),
          CREATE_TARGET.Name,
          {
            sourceIndex: response.sourceIndex,
          }
        );
      case 'source_missing':
        return transitionTo(
          appendLog(state, `v3 CHECK_SOURCE failed: ${response.reason}`),
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
