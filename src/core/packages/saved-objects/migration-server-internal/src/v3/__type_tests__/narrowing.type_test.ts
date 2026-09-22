/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Expect, Equals } from './type_test_helpers';
import type { State, StateOf } from '../state';
import { assertNever } from '../assert_never';
import type { InitResponse } from '../io';
import type * as INIT from '../steps/init';

// N1 / §5.4 — state.name narrows State to StateOf<'X'>
export const assertInitNarrowing = (state: State): void => {
  if (state.name === 'INIT') {
    void (true as Expect<Equals<typeof state, StateOf<'INIT'>>>);
    const _check: INIT.State = state;
    void _check;
  }
};

// N2 — response.type narrows InitResponse inside switch cases
export const assertInitResponseNarrowing = (response: InitResponse): void => {
  switch (response.type) {
    case 'fatal':
      void (true as Expect<Equals<typeof response, Extract<InitResponse, { type: 'fatal' }>>>);
      break;
    case 'wait_for_migration_completion':
      void (true as Expect<
        Equals<typeof response, Extract<InitResponse, { type: 'wait_for_migration_completion' }>>
      >);
      break;
    case 'wait_for_yellow_source':
      void (true as Expect<
        Equals<typeof response, Extract<InitResponse, { type: 'wait_for_yellow_source' }>>
      >);
      break;
    case 'create_index_check_routing':
      void (true as Expect<
        Equals<typeof response, Extract<InitResponse, { type: 'create_index_check_routing' }>>
      >);
      break;
    case 'retryable_failure':
      void (true as Expect<
        Equals<typeof response, Extract<InitResponse, { type: 'retryable_failure' }>>
      >);
      break;
    default:
      return assertNever(response);
  }
};

// N3 — assertNever requires never
const exhaust = (x: never) => assertNever(x);
void exhaust(undefined as never);

export {};
