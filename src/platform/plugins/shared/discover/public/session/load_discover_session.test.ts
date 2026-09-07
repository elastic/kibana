/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { createDiscoverServicesMock } from '../__mocks__/services';
import type { DiscoverSessionPersistence } from './persistence';
import { loadDiscoverSession } from './load_discover_session';

const session = createDiscoverSessionMock({ id: 'test-session' });

describe('loadDiscoverSession', () => {
  it('warns when some content was omitted and returns the session', async () => {
    const { core } = createDiscoverServicesMock();
    const persistence: jest.Mocked<DiscoverSessionPersistence> = {
      get: jest.fn().mockResolvedValue({
        session,
        warnings: [
          {
            type: 'dropped_property',
            tab_id: 'tab-1',
            key: 'control_panels',
            message: 'Unable to transform control panels.',
          },
        ],
      }),
      save: jest.fn(),
    };

    const result = await loadDiscoverSession({
      id: session.id,
      persistence,
      core,
    });

    expect(result).toBe(session);
    expect(core.notifications.toasts.addWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        'data-test-subj': 'discoverSessionLoadWarning',
      })
    );
  });

  it('does not warn when the session loads without warnings', async () => {
    const { core } = createDiscoverServicesMock();
    const persistence: jest.Mocked<DiscoverSessionPersistence> = {
      get: jest.fn().mockResolvedValue({ session, warnings: [] }),
      save: jest.fn(),
    };

    const result = await loadDiscoverSession({
      id: session.id,
      persistence,
      core,
    });

    expect(result).toBe(session);
    expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();
  });
});
