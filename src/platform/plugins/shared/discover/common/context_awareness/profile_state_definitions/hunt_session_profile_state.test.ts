/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createProfileStateRegistry } from '../create_profile_state_registry';
import { ProfileStateType } from '../profile_state';
import { HUNT_SESSION_STATE_DEF } from './hunt_session_profile_state';

describe('HUNT_SESSION_STATE_DEF', () => {
  it('uses the key AlertZero writes into locator profile state', () => {
    expect(HUNT_SESSION_STATE_DEF.key).toBe('huntSession');
  });

  it('is registered with the Discover profile state registry', () => {
    expect(createProfileStateRegistry().hasDefinition(HUNT_SESSION_STATE_DEF)).toBe(true);
  });

  it('carries the token in navigation state, never in the URL', () => {
    const registry = createProfileStateRegistry();
    const profileStateMap = { huntSession: { token: 'signed' } };

    expect(
      registry.pickStateByType({
        profileStateMap,
        stateTypes: [ProfileStateType.Url],
      })
    ).toEqual({});
    expect(
      registry.pickStateByType({
        profileStateMap,
        stateTypes: [ProfileStateType.Persistent],
      })
    ).toEqual({ huntSession: { token: 'signed' } });
  });
});
