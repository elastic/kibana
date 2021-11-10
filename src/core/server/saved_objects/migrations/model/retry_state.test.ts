/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resetRetryState, delayRetryState } from './retry_state';
import { State } from '../state';

const createState = (parts: Record<string, any>) => {
  return parts as State;
};

describe('delayRetryState', () => {
  it('returns the provided state with updated retry properties', () => {
    const state = createState({
      controlState: 'TEST',
      hello: 'dolly',
      retryCount: 0,
      retryDelay: 0,
      logs: [],
    });

    expect(delayRetryState(state, 'some-error', 5)).toEqual({
      controlState: 'TEST',
      hello: 'dolly',
      retryCount: 1,
      retryDelay: 2000,
      logs: [
        {
          level: 'error',
          message: `Action failed with 'some-error'. Retrying attempt 1 in 2 seconds.`,
        },
      ],
    });
  });

  it('can be chained', () => {
    let state = createState({
      controlState: 'TEST',
      hello: 'dolly',
      retryCount: 0,
      retryDelay: 0,
      logs: [],
    });

    for (let i = 0; i < 5; i++) {
      state = delayRetryState(state, 'some-error', 10);
    }

    expect(state).toEqual({
      controlState: 'TEST',
      hello: 'dolly',
      retryCount: 5,
      retryDelay: 32000,
      logs: [
        {
          level: 'error',
          message: `Action failed with 'some-error'. Retrying attempt 1 in 2 seconds.`,
        },
        {
          level: 'error',
          message: `Action failed with 'some-error'. Retrying attempt 2 in 4 seconds.`,
        },
        {
          level: 'error',
          message: `Action failed with 'some-error'. Retrying attempt 3 in 8 seconds.`,
        },
        {
          level: 'error',
          message: `Action failed with 'some-error'. Retrying attempt 4 in 16 seconds.`,
        },
        {
          level: 'error',
          message: `Action failed with 'some-error'. Retrying attempt 5 in 32 seconds.`,
        },
      ],
    });
  });

  it('limits the retry delay to 64s', () => {
    let state = createState({
      controlState: 'TEST',
      hello: 'dolly',
      retryCount: 0,
      retryDelay: 0,
      logs: [],
    });

    for (let i = 0; i < 10; i++) {
      state = delayRetryState(state, 'some-error', 10);
    }

    expect(state.retryDelay).toEqual(64000);
  });

  it('returns a FATAL state if the retryCount exceed the max allowed number of attempts', () => {
    const state = createState({
      controlState: 'TEST',
      hello: 'dolly',
      retryCount: 5,
      retryDelay: 64,
    });

    expect(delayRetryState(state, 'some-error', 5)).toEqual({
      controlState: 'FATAL',
      hello: 'dolly',
      retryCount: 5,
      retryDelay: 64,
      reason: `Unable to complete the TEST step after 5 attempts, terminating.`,
    });
  });
});

describe('resetRetryState', () => {
  it('resets the retry attributes of the state', () => {
    const state = createState({
      hello: 'dolly',
      foo: 42,
      retryCount: 5,
      retryDelay: 1000,
    });

    expect(resetRetryState(state)).toEqual({
      ...state,
      retryCount: 0,
      retryDelay: 0,
    });
  });

  it('works when the retry attributes are not yet present on the state', () => {
    const state = createState({
      hello: 'dolly',
      foo: 42,
    });

    expect(resetRetryState(state)).toEqual({
      ...state,
      retryCount: 0,
      retryDelay: 0,
    });
  });
});
