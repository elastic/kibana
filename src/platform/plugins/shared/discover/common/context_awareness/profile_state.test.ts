/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TEST_PROFILE_STATE_DEF } from '../../public/context_awareness/__mocks__/profile_state';
import {
  type ProfileStateDefinition,
  ProfileStateRegistry,
  ProfileStateType,
} from './profile_state';

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
        profileStateMap: {
          testProfileState: {
            uiValue: 'ui',
            urlValue: 'url',
            persistentValue: 'persistent',
          },
          unregisteredProfileState: { uiValue: 'ignored' },
        },
        stateTypes: [ProfileStateType.Ui],
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
        profileStateMap: {
          testProfileState: {
            uiValue: 'ui',
          },
        },
        stateTypes: [ProfileStateType.Persistent],
      })
    ).toEqual({});
  });

  it('returns an empty object when picking state by type from undefined state', () => {
    const registry = new ProfileStateRegistry();
    registry.registerDefinition(TEST_PROFILE_STATE_DEF);

    expect(
      registry.pickStateByType({
        profileStateMap: undefined,
        stateTypes: [ProfileStateType.Persistent],
      })
    ).toEqual({});
  });

  it('ignores sparse and unregistered fields when picking state by type', () => {
    const registry = new ProfileStateRegistry();
    registry.registerDefinition(TEST_PROFILE_STATE_DEF);

    expect(
      registry.pickStateByType({
        profileStateMap: {
          testProfileState: {
            uiValue: 'ui',
            unregisteredValue: 'ignored',
          },
          unregisteredProfileState: {
            uiValue: 'ignored',
          },
        },
        stateTypes: [ProfileStateType.Ui],
      })
    ).toEqual({
      testProfileState: {
        uiValue: 'ui',
      },
    });
  });

  it('picks state by type expanded with defaults for requested types', () => {
    const registry = new ProfileStateRegistry();
    registry.registerDefinition(TEST_PROFILE_STATE_DEF);

    expect(
      registry.pickStateByType({
        profileStateMap: {
          testProfileState: {
            uiValue: 'ui',
            persistentValue: 'persistent',
          },
        },
        stateTypes: [ProfileStateType.Url, ProfileStateType.Persistent],
        defaultsHandling: 'expand',
      })
    ).toEqual({
      testProfileState: {
        urlValue: 'defaultUrl',
        persistentValue: 'persistent',
      },
    });
  });

  it('picks no expanded state when no registered fields match the requested type', () => {
    const registry = new ProfileStateRegistry();
    registry.registerDefinition(TEST_PROFILE_STATE_DEF);

    expect(
      registry.pickStateByType({
        profileStateMap: {
          testProfileState: {
            uiValue: 'ui',
          },
          unregisteredProfileState: {
            persistentValue: 'ignored',
          },
        },
        stateTypes: [ProfileStateType.Persistent],
        defaultsHandling: 'expand',
      })
    ).toEqual({});
  });

  it('picks state by type stripped of default values', () => {
    const registry = new ProfileStateRegistry();
    registry.registerDefinition(TEST_PROFILE_STATE_DEF);

    expect(
      registry.pickStateByType({
        profileStateMap: {
          testProfileState: {
            uiValue: 'defaultUi',
            urlValue: 'url',
            persistentValue: 'defaultPersistent',
            nestedValue: { count: 0 },
          },
        },
        stateTypes: [ProfileStateType.Ui, ProfileStateType.Url, ProfileStateType.Persistent],
        defaultsHandling: 'strip',
      })
    ).toEqual({
      testProfileState: {
        urlValue: 'url',
      },
    });
  });

  it('omits default-only state when stripping defaults', () => {
    const registry = new ProfileStateRegistry();
    registry.registerDefinition(TEST_PROFILE_STATE_DEF);

    expect(
      registry.pickStateByType({
        profileStateMap: {
          testProfileState: TEST_PROFILE_STATE_DEF.defaultState,
        },
        stateTypes: [ProfileStateType.Ui, ProfileStateType.Url, ProfileStateType.Persistent],
        defaultsHandling: 'strip',
      })
    ).toEqual({});
  });

  it('merges registered profile state maps in order', () => {
    const registry = new ProfileStateRegistry();
    const secondaryProfileStateDef: ProfileStateDefinition<{
      secondaryUiValue: string;
      secondaryUrlValue: string;
    }> = {
      key: 'secondaryProfileState',
      descriptor: {
        secondaryUiValue: { type: ProfileStateType.Ui },
        secondaryUrlValue: { type: ProfileStateType.Url },
      },
      defaultState: {
        secondaryUiValue: 'defaultSecondaryUi',
        secondaryUrlValue: 'defaultSecondaryUrl',
      },
    };

    registry.registerDefinition(TEST_PROFILE_STATE_DEF);
    registry.registerDefinition(secondaryProfileStateDef);

    expect(
      registry.mergeState(
        {
          testProfileState: {
            uiValue: 'firstUi',
            urlValue: 'firstUrl',
            unregisteredValue: 'ignored',
          },
          secondaryProfileState: {
            secondaryUrlValue: 'firstSecondaryUrl',
          },
          unregisteredProfileState: {
            uiValue: 'ignored',
          },
        },
        undefined,
        {
          testProfileState: {
            uiValue: 'secondUi',
            persistentValue: 'secondPersistent',
          },
          secondaryProfileState: {
            secondaryUiValue: 'secondSecondaryUi',
          },
        }
      )
    ).toEqual({
      testProfileState: {
        uiValue: 'secondUi',
        urlValue: 'firstUrl',
        persistentValue: 'secondPersistent',
      },
      secondaryProfileState: {
        secondaryUrlValue: 'firstSecondaryUrl',
        secondaryUiValue: 'secondSecondaryUi',
      },
    });
  });

  it('returns an empty object when merging only undefined or unregistered state', () => {
    const registry = new ProfileStateRegistry();
    registry.registerDefinition(TEST_PROFILE_STATE_DEF);

    expect(
      registry.mergeState(undefined, {
        unregisteredProfileState: {
          uiValue: 'ignored',
        },
      })
    ).toEqual({});
  });

  it('picks fields by state type from a single profile state object', () => {
    const registry = new ProfileStateRegistry();
    registry.registerDefinition(TEST_PROFILE_STATE_DEF);

    expect(
      registry.filterFieldsByType({
        profileState: {
          uiValue: 'ui',
          urlValue: 'url',
          persistentValue: 'persistent',
          nestedValue: { count: 1 },
        },
        stateKey: TEST_PROFILE_STATE_DEF.key,
        stateTypes: [ProfileStateType.Ui, ProfileStateType.Url],
      })
    ).toEqual({
      uiValue: 'ui',
      urlValue: 'url',
      nestedValue: { count: 1 },
    });
  });

  it('returns undefined when no fields match a single profile state object', () => {
    const registry = new ProfileStateRegistry();
    registry.registerDefinition(TEST_PROFILE_STATE_DEF);

    expect(
      registry.filterFieldsByType({
        profileState: {
          uiValue: 'ui',
        },
        stateKey: TEST_PROFILE_STATE_DEF.key,
        stateTypes: [ProfileStateType.Persistent],
      })
    ).toBeUndefined();
  });

  it('picks fields by state type from a single profile state object expanded with defaults', () => {
    const registry = new ProfileStateRegistry();
    registry.registerDefinition(TEST_PROFILE_STATE_DEF);

    expect(
      registry.filterFieldsByType({
        profileState: {
          uiValue: 'ui',
          persistentValue: 'persistent',
        },
        stateKey: TEST_PROFILE_STATE_DEF.key,
        stateTypes: [ProfileStateType.Url, ProfileStateType.Persistent],
        defaultsHandling: 'expand',
      })
    ).toEqual({
      urlValue: 'defaultUrl',
      persistentValue: 'persistent',
    });
  });

  it('picks fields by state type from a single profile state object stripped of defaults', () => {
    const registry = new ProfileStateRegistry();
    registry.registerDefinition(TEST_PROFILE_STATE_DEF);

    expect(
      registry.filterFieldsByType({
        profileState: {
          uiValue: 'ui',
          urlValue: 'defaultUrl',
          persistentValue: 'defaultPersistent',
          nestedValue: { count: 0 },
        },
        stateKey: TEST_PROFILE_STATE_DEF.key,
        stateTypes: [ProfileStateType.Ui, ProfileStateType.Url, ProfileStateType.Persistent],
        defaultsHandling: 'strip',
      })
    ).toEqual({
      uiValue: 'ui',
    });
  });
});
