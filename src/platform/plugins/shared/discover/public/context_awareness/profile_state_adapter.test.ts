/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { type ProfileStateDefinition, ProfileStateRegistry } from '../../common/context_awareness';
import { TEST_PROFILE_STATE_DEF } from './__mocks__/profile_state';
import {
  createProfileStateAdapterFactory,
  type ProfileStateAdapter,
} from './profile_state_adapter';

describe('createProfileStateAdapterFactory', () => {
  const createRegisteredRegistry = () => {
    const registry = new ProfileStateRegistry();
    registry.registerDefinition(TEST_PROFILE_STATE_DEF);
    return registry;
  };

  const createTestAdapter = <TState extends SerializableRecord>(
    state: TState
  ): ProfileStateAdapter<TState> => ({
    getState: () => state,
    getState$: jest.fn(),
    setState: jest.fn(),
    updateState: jest.fn(),
  });

  it('creates an adapter for a registered definition', () => {
    const createAdapterSpy = jest.fn();
    const createAdapter = <TState extends SerializableRecord>(
      definition: ProfileStateDefinition<TState>
    ) => {
      createAdapterSpy(definition);
      return createTestAdapter(definition.defaultState);
    };
    const getStateAdapter = createProfileStateAdapterFactory({
      createAdapter,
      profileStateRegistry: createRegisteredRegistry(),
    });

    const adapter = getStateAdapter(TEST_PROFILE_STATE_DEF);

    expect(adapter.getState()).toEqual(TEST_PROFILE_STATE_DEF.defaultState);
    expect(createAdapterSpy).toHaveBeenCalledWith(TEST_PROFILE_STATE_DEF);
  });

  it('caches adapters by definition key', () => {
    const createAdapterSpy = jest.fn();
    const createAdapter = <TState extends SerializableRecord>(
      definition: ProfileStateDefinition<TState>
    ) => {
      createAdapterSpy(definition);
      return createTestAdapter(definition.defaultState);
    };
    const getStateAdapter = createProfileStateAdapterFactory({
      createAdapter,
      profileStateRegistry: createRegisteredRegistry(),
    });

    expect(getStateAdapter(TEST_PROFILE_STATE_DEF)).toBe(getStateAdapter(TEST_PROFILE_STATE_DEF));
    expect(createAdapterSpy).toHaveBeenCalledTimes(1);
  });

  it('throws when the profile state definition is not registered', () => {
    const getStateAdapter = createProfileStateAdapterFactory({
      createAdapter: jest.fn(),
      profileStateRegistry: new ProfileStateRegistry(),
    });

    expect(() => getStateAdapter(TEST_PROFILE_STATE_DEF)).toThrow(
      'State with key testProfileState is not registered.'
    );
  });
});
