/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createInMemoryContextAwarenessToolkit } from './in_memory_profile_state_toolkit';
import {
  type ProfileStateDefinition,
  ProfileStateRegistry,
  ProfileStateType,
} from './profile_state';

interface TestProfileState {
  uiValue: string;
  urlValue: string;
  persistentValue: string;
  nestedValue: {
    count: number;
  };
}

const TEST_PROFILE_STATE_DEF: ProfileStateDefinition<TestProfileState> = {
  key: 'testProfileState',
  descriptor: {
    uiValue: { type: ProfileStateType.Ui },
    urlValue: { type: ProfileStateType.Url },
    persistentValue: { type: ProfileStateType.Persistent },
    nestedValue: { type: ProfileStateType.Ui },
  },
  defaultState: {
    uiValue: 'defaultUi',
    urlValue: 'defaultUrl',
    persistentValue: 'defaultPersistent',
    nestedValue: { count: 0 },
  },
};

const createRegisteredRegistry = () => {
  const profileStateRegistry = new ProfileStateRegistry();
  profileStateRegistry.registerDefinition(TEST_PROFILE_STATE_DEF);
  return profileStateRegistry;
};

describe('createInMemoryContextAwarenessToolkit', () => {
  it('exposes provided actions', () => {
    const refreshData = jest.fn();
    const toolkit = createInMemoryContextAwarenessToolkit({
      actions: { refreshData },
      profileStateRegistry: createRegisteredRegistry(),
    });

    expect(toolkit.actions.refreshData).toBe(refreshData);
  });

  it('stores all profile state descriptor types in memory', () => {
    const stateAdapter = createInMemoryContextAwarenessToolkit({
      profileStateRegistry: createRegisteredRegistry(),
    }).getStateAdapter(TEST_PROFILE_STATE_DEF);

    expect(stateAdapter.getState()).toEqual(TEST_PROFILE_STATE_DEF.defaultState);

    stateAdapter.setState({
      uiValue: 'ui',
      urlValue: 'url',
      persistentValue: 'persistent',
      nestedValue: { count: 1 },
    });

    expect(stateAdapter.getState()).toEqual({
      uiValue: 'ui',
      urlValue: 'url',
      persistentValue: 'persistent',
      nestedValue: { count: 1 },
    });

    stateAdapter.updateState({ urlValue: 'updatedUrl' });

    expect(stateAdapter.getState()).toEqual({
      uiValue: 'ui',
      urlValue: 'updatedUrl',
      persistentValue: 'persistent',
      nestedValue: { count: 1 },
    });
  });

  it('emits profile state updates and skips deep equal duplicate values', () => {
    const stateAdapter = createInMemoryContextAwarenessToolkit({
      profileStateRegistry: createRegisteredRegistry(),
    }).getStateAdapter(TEST_PROFILE_STATE_DEF);
    const emittedValues: Array<Partial<TestProfileState>> = [];
    const subscription = stateAdapter.getState$().subscribe((state) => emittedValues.push(state));

    stateAdapter.setState({
      uiValue: 'ui',
      urlValue: 'url',
      persistentValue: 'persistent',
      nestedValue: { count: 1 },
    });
    stateAdapter.setState({
      uiValue: 'ui',
      urlValue: 'url',
      persistentValue: 'persistent',
      nestedValue: { count: 1 },
    });
    stateAdapter.updateState({ nestedValue: { count: 2 } });
    subscription.unsubscribe();

    expect(emittedValues).toEqual([
      TEST_PROFILE_STATE_DEF.defaultState,
      {
        uiValue: 'ui',
        urlValue: 'url',
        persistentValue: 'persistent',
        nestedValue: { count: 1 },
      },
      {
        uiValue: 'ui',
        urlValue: 'url',
        persistentValue: 'persistent',
        nestedValue: { count: 2 },
      },
    ]);
  });

  it('caches adapters by definition key', () => {
    const toolkit = createInMemoryContextAwarenessToolkit({
      profileStateRegistry: createRegisteredRegistry(),
    });

    expect(toolkit.getStateAdapter(TEST_PROFILE_STATE_DEF)).toBe(
      toolkit.getStateAdapter(TEST_PROFILE_STATE_DEF)
    );
  });

  it('isolates state between toolkit instances', () => {
    const profileStateRegistry = createRegisteredRegistry();
    const firstToolkit = createInMemoryContextAwarenessToolkit({ profileStateRegistry });
    const secondToolkit = createInMemoryContextAwarenessToolkit({ profileStateRegistry });

    firstToolkit.getStateAdapter(TEST_PROFILE_STATE_DEF).setState({
      uiValue: 'ui',
      urlValue: 'url',
      persistentValue: 'persistent',
      nestedValue: { count: 1 },
    });

    expect(secondToolkit.getStateAdapter(TEST_PROFILE_STATE_DEF).getState()).toEqual(
      TEST_PROFILE_STATE_DEF.defaultState
    );
  });

  it('throws when the profile state definition is not registered', () => {
    const toolkit = createInMemoryContextAwarenessToolkit({
      profileStateRegistry: new ProfileStateRegistry(),
    });

    expect(() => toolkit.getStateAdapter(TEST_PROFILE_STATE_DEF)).toThrow(
      'State with key testProfileState is not registered.'
    );
  });
});
