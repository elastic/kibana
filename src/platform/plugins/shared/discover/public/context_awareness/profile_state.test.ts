/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type ProfileStateDefinition,
  ProfileStateRegistry,
  ProfileStateType,
} from './profile_state';

interface TestProfileState {
  uiValue: string;
  urlValue: string;
  persistentValue: string;
}

const TEST_PROFILE_STATE_DEF: ProfileStateDefinition<TestProfileState> = {
  key: 'testProfileState',
  descriptor: {
    uiValue: { type: ProfileStateType.Ui },
    urlValue: { type: ProfileStateType.Url },
    persistentValue: { type: ProfileStateType.Persistent },
  },
  defaultState: {
    uiValue: 'defaultUi',
    urlValue: 'defaultUrl',
    persistentValue: 'defaultPersistent',
  },
};

describe('ProfileStateRegistry', () => {
  it('registers and matches definitions', () => {
    const registry = new ProfileStateRegistry();

    registry.registerDefinition(TEST_PROFILE_STATE_DEF);

    expect(registry.hasDefinition(TEST_PROFILE_STATE_DEF)).toBe(true);
    expect(
      registry.hasDefinition({
        ...TEST_PROFILE_STATE_DEF,
        descriptor: {
          ...TEST_PROFILE_STATE_DEF.descriptor,
          uiValue: { type: ProfileStateType.Url },
        },
      })
    ).toBe(false);
  });

  it('does not match definitions with different defaults', () => {
    const registry = new ProfileStateRegistry();

    registry.registerDefinition(TEST_PROFILE_STATE_DEF);

    expect(
      registry.hasDefinition({
        ...TEST_PROFILE_STATE_DEF,
        defaultState: {
          ...TEST_PROFILE_STATE_DEF.defaultState,
          uiValue: 'differentDefaultUi',
        },
      })
    ).toBe(false);
  });

  it('rejects duplicate keys', () => {
    const registry = new ProfileStateRegistry();

    registry.registerDefinition(TEST_PROFILE_STATE_DEF);

    expect(() => registry.registerDefinition(TEST_PROFILE_STATE_DEF)).toThrow(
      'State with key testProfileState is already registered.'
    );
  });

  it('picks registered fields by state type', () => {
    const registry = new ProfileStateRegistry();
    registry.registerDefinition(TEST_PROFILE_STATE_DEF);

    expect(
      registry.pickStateByType({
        profileState: {
          testProfileState: {
            uiValue: 'ui',
            urlValue: 'url',
            persistentValue: 'persistent',
          },
          unregisteredProfileState: { uiValue: 'ignored' },
        },
        stateType: ProfileStateType.Ui,
      })
    ).toEqual({
      testProfileState: {
        uiValue: 'ui',
      },
    });
  });

  it('returns an empty object when no fields match', () => {
    const registry = new ProfileStateRegistry();
    registry.registerDefinition(TEST_PROFILE_STATE_DEF);

    expect(
      registry.pickStateByType({
        profileState: {
          testProfileState: {
            uiValue: 'ui',
          },
        },
        stateType: ProfileStateType.Persistent,
      })
    ).toEqual({});
  });
});
