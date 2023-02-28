/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import type { State, AllActionStates } from '../state';
import type { ResponseType } from '../next';
import { delayRetryState, resetRetryState } from '../../model/retry_state';
import { throwBadControlState } from '../../model/helpers';
import { isTypeof } from '../actions';
import { MigratorContext } from '../context';
import * as Stages from './stages';
import { StateActionResponse } from './types';

export const model = (
  current: State,
  response: ResponseType<AllActionStates>,
  context: MigratorContext
): State => {
  if (Either.isLeft<unknown, unknown>(response)) {
    if (isTypeof(response.left, 'retryable_es_client_error')) {
      return delayRetryState(current, response.left.message, context.maxRetryAttempts);
    }
  } else {
    current = resetRetryState(current);
  }

  switch (current.controlState) {
    case 'INIT':
      return Stages.init(current, response as StateActionResponse<'INIT'>, context);
    case 'DONE':
    case 'FATAL':
      // The state-action machine will never call the model in the terminating states
      return throwBadControlState(current as never);
    default:
      return throwBadControlState(current);
  }
};
