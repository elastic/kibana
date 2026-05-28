/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IO } from './io';
import type { NonTerminalState, State } from './state';
import { assertNever, runStep } from './types';
import * as CHECK_SOURCE from './steps/check_source';
import * as CREATE_TARGET from './steps/create_target';
import * as INIT from './steps/init';
import * as MARK_READY from './steps/mark_ready';

export const next = async (state: NonTerminalState, io: IO): Promise<State> => {
  switch (state.name) {
    case INIT.Name:
      return runStep(INIT.step(state, io));
    case CHECK_SOURCE.Name:
      return runStep(CHECK_SOURCE.step(state, io));
    case CREATE_TARGET.Name:
      return runStep(CREATE_TARGET.step(state, io));
    case MARK_READY.Name:
      return runStep(MARK_READY.step(state, io));
    default:
      return assertNever(state);
  }
};
