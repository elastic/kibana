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
    context = createContextMock({ indexPrefix: '.kibana' });
  });

  test('INIT -> WAIT_FOR_YELLOW_INDEX when index is found', () => {
    const state = createState();
    const res: StateActionResponse<'INIT'> = Either.right({
      '.kibana_1': {
        aliases: {
          '.kibana': {},
        },
        mappings: { properties: {} },
        settings: {},
      },
    });

    const newState = init(state, res, context);

    expect(newState).toEqual(
      expect.objectContaining({
        controlState: 'WAIT_FOR_YELLOW_INDEX',
        currentIndex: '.kibana_1',
        previousMappings: { properties: {} },
      })
    );
  });

  test('INIT -> CREATE_TARGET_INDEX because its not implemented yet', () => {
    const state = createState();
    const res: StateActionResponse<'INIT'> = Either.right({
      '.foo_1': {
        aliases: {
          '.some_alias': {},
        },
        mappings: { properties: {} },
        settings: {},
      },
    });

    const newState = init(state, res, context);

    expect(newState).toEqual(
      expect.objectContaining({
        controlState: 'CREATE_TARGET_INDEX',
      })
    );
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
