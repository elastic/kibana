/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import { createContextMock, MockedMigratorContext } from '../../test_helpers';
import type { InitState } from '../../state';
import type { StateActionResponse } from '../types';
import { init } from './init';

describe('Action: init', () => {
  let context: MockedMigratorContext;

  const createState = (parts: Partial<InitState> = {}): InitState => ({
    controlState: 'INIT',
    retryDelay: 0,
    retryCount: 0,
    logs: [],
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  test('INIT -> DONE because its not implemented yet', () => {
    const state = createState();
    const res: StateActionResponse<'INIT'> = Either.right({
      '.kibana_8.7.0_001': {
        aliases: {
          '.kibana': {},
          '.kibana_8.7.0': {},
        },
        mappings: { properties: {} },
        settings: {},
      },
    });

    const newState = init(state, res, context);

    expect(newState.controlState).toEqual('DONE');
  });

  test('INIT -> INIT when cluster routing allocation is incompatible', () => {
    const state = createState();
    const res: StateActionResponse<'INIT'> = Either.left({
      type: 'incompatible_cluster_routing_allocation',
    });

    const newState = init(state, res, context);

    expect(newState.controlState).toEqual('INIT');
    expect(newState.retryCount).toEqual(1);
    expect(newState.retryDelay).toEqual(2000);
    expect(newState.logs).toHaveLength(1);
  });
});
