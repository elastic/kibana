/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createRegisteredTestProfileStateRegistry,
  TEST_PROFILE_STATE_DEF,
} from '../../../../context_awareness/__mocks__/profile_state';
import { getProfileUrlState } from './profile_state_url';

const getProfileState = () => ({
  [TEST_PROFILE_STATE_DEF.key]: {
    uiValue: 'ui',
    urlValue: 'url',
    persistentValue: 'persistent',
    nestedValue: { count: 1 },
  },
});

describe('profile state URL helpers', () => {
  const setup = () => ({
    profileStateRegistry: createRegisteredTestProfileStateRegistry(),
    profileStateDefinition: TEST_PROFILE_STATE_DEF,
  });

  describe('getProfileUrlState', () => {
    it('returns non-default URL fields for the active profile state definition', () => {
      const { profileStateRegistry, profileStateDefinition } = setup();

      expect(
        getProfileUrlState({
          profileState: {
            ...getProfileState(),
            unregisteredProfileState: { urlValue: 'ignored' },
          },
          profileStateDefinition,
          profileStateRegistry,
        })
      ).toEqual({
        testProfileState: {
          urlValue: 'url',
        },
      });
    });

    it('returns undefined when URL fields match their defaults', () => {
      const { profileStateRegistry, profileStateDefinition } = setup();

      expect(
        getProfileUrlState({
          profileState: {
            [TEST_PROFILE_STATE_DEF.key]: {
              ...TEST_PROFILE_STATE_DEF.defaultState,
              uiValue: 'customUi',
              persistentValue: 'customPersistent',
            },
          },
          profileStateDefinition,
          profileStateRegistry,
        })
      ).toBeUndefined();
    });

    it('returns undefined without an active profile state definition', () => {
      const { profileStateRegistry } = setup();

      expect(
        getProfileUrlState({
          profileState: getProfileState(),
          profileStateDefinition: undefined,
          profileStateRegistry,
        })
      ).toBeUndefined();
    });
  });
});
