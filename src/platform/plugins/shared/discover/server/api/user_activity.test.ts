/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import { trackDiscoverSessionAction } from './user_activity';

describe('trackDiscoverSessionAction', () => {
  const result = {
    id: 'session-1',
    data: {
      title: 'My Discover session',
      tags: ['tag-1', 'tag-2'],
    },
  };
  let trackUserAction: jest.Mock;
  let userActivity: CoreSetup['userActivity'];

  beforeEach(() => {
    trackUserAction = jest.fn();
    userActivity = { trackUserAction };
  });

  it.each([
    ['create', 'discover_session_create', 'creation', 'created'],
    ['update', 'discover_session_update', 'change', 'updated'],
    ['delete', 'discover_session_delete', 'deletion', 'deleted'],
  ] as const)('tracks a successful %s', (operation, action, eventType, verb) => {
    trackDiscoverSessionAction(userActivity, operation, result);

    expect(trackUserAction).toHaveBeenCalledWith({
      message: `User ${verb} Discover session "My Discover session" (id: session-1).`,
      event: {
        action,
        type: eventType,
      },
      object: {
        id: 'session-1',
        name: 'My Discover session',
        type: 'discover_session',
        tags: ['tag-1', 'tag-2'],
      },
    });
  });

  it('does not propagate tracking errors', () => {
    trackUserAction.mockImplementationOnce(() => {
      throw new Error('Tracking failed');
    });

    expect(() => trackDiscoverSessionAction(userActivity, 'create', result)).not.toThrow();
  });
});
