/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InitResponse, IO } from '../io';
import { appendLog, resetRetry, transitionTo, type BaseState } from '../state';
import type { Step, SuccessorsOf } from '../types';
import { assertNever } from '../assert_never';
import * as CHECK_SOURCE from './check_source';

export const Name = 'INIT' as const;

export interface State extends BaseState {
  readonly name: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, InitResponse> => ({
  action: () => io.init(),
  transition: (response) => {
    switch (response.type) {
      case 'started':
        return transitionTo(
          resetRetry(appendLog(state, 'v3 INIT completed')),
          CHECK_SOURCE.Name,
          {}
        );
    }

    return assertNever(response.type);
  },
});
