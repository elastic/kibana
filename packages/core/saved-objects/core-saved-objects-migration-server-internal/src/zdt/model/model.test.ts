/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StageMocks } from './model.test.mocks';
import * as Either from 'fp-ts/lib/Either';
import { createContextMock, MockedMigratorContext } from '../test_helpers';
import type { RetryableEsClientError } from '../../actions';
import type { State, BaseState, FatalState } from '../state';
import type { StateActionResponse } from './types';
import { model } from './model';

describe('model', () => {
  let context: MockedMigratorContext;

  beforeEach(() => {
    context = createContextMock();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const baseState: BaseState = {
    controlState: '42',
    retryCount: 0,
    retryDelay: 0,
    logs: [],
  };

  const retryableError: RetryableEsClientError = {
    type: 'retryable_es_client_error',
    message: 'snapshot_in_progress_exception',
  };

  describe('retry behavior', () => {
    test('increments retryCount, exponential retryDelay if an action fails with a retryable_es_client_error', () => {
      let state: State = {
        ...baseState,
        controlState: 'INIT',
      };

      const states = new Array(5).fill(1).map(() => {
        state = model(state, Either.left(retryableError), context);
        return state;
      });
      const retryState = states.map(({ retryCount, retryDelay }) => ({ retryCount, retryDelay }));
      expect(retryState).toMatchInlineSnapshot(`
        Array [
          Object {
            "retryCount": 1,
            "retryDelay": 2000,
          },
          Object {
            "retryCount": 2,
            "retryDelay": 4000,
          },
          Object {
            "retryCount": 3,
            "retryDelay": 8000,
          },
          Object {
            "retryCount": 4,
            "retryDelay": 16000,
          },
          Object {
            "retryCount": 5,
            "retryDelay": 32000,
          },
        ]
      `);
    });

    test('resets retryCount, retryDelay when an action succeeds', () => {
      const state: State = {
        ...baseState,
        controlState: 'INIT',
        retryCount: 5,
        retryDelay: 32000,
      };
      const res: StateActionResponse<'INIT'> = Either.right({
        '.kibana_7.11.0_001': {
          aliases: {},
          mappings: { properties: {} },
          settings: {},
        },
      });
      const newState = model(state, res, context);

      expect(newState.retryCount).toEqual(0);
      expect(newState.retryDelay).toEqual(0);
    });

    test('terminates to FATAL after retryAttempts retries', () => {
      const state: State = {
        ...baseState,
        controlState: 'INIT',
        retryCount: 15,
        retryDelay: 64000,
      };

      const newState = model(state, Either.left(retryableError), context) as FatalState;

      expect(newState.controlState).toEqual('FATAL');
      expect(newState.reason).toMatchInlineSnapshot(
        `"Unable to complete the INIT step after 15 attempts, terminating. The last failure message was: snapshot_in_progress_exception"`
      );
    });
  });

  describe('dispatching to correct stage', () => {
    test('dispatching INIT state', () => {
      const state: State = {
        ...baseState,
        controlState: 'INIT',
      };
      const res: StateActionResponse<'INIT'> = Either.right({
        '.kibana_7.11.0_001': {
          aliases: {},
          mappings: { properties: {} },
          settings: {},
        },
      });
      model(state, res, context);

      expect(StageMocks.init).toHaveBeenCalledTimes(1);
      expect(StageMocks.init).toHaveBeenCalledWith(state, res, context);
    });
  });
});
