/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { internalStateActions } from '..';
import * as resetDiscoverSessionActions from './reset_discover_session';
import { setup } from './reset_discover_session.test';

describe('openDiscoverSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should open discover session by navigating to locator if session id differs', async () => {
    const { internalState, services } = await setup();

    const navigateSpy = jest.spyOn(services.locator, 'navigate');
    const resetDiscoverSessionSpy = jest.spyOn(resetDiscoverSessionActions, 'resetDiscoverSession');

    await internalState
      .dispatch(
        internalStateActions.openDiscoverSession({
          discoverSessionId: 'different-session-id',
        })
      )
      .unwrap();

    expect(navigateSpy).toHaveBeenCalledWith({
      savedSearchId: 'different-session-id',
    });
    expect(resetDiscoverSessionSpy).not.toHaveBeenCalled();
  });

  it('should reset discover session if session id is the same', async () => {
    const { internalState, persistedDiscoverSession, services } = await setup();

    const navigateSpy = jest.spyOn(services.locator, 'navigate');
    const resetDiscoverSessionSpy = jest.spyOn(resetDiscoverSessionActions, 'resetDiscoverSession');

    await internalState
      .dispatch(
        internalStateActions.openDiscoverSession({
          discoverSessionId: persistedDiscoverSession.id,
        })
      )
      .unwrap();

    expect(resetDiscoverSessionSpy).toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
