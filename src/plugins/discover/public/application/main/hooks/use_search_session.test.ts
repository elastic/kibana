/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useSearchSession } from './use_search_session';
import { renderHook } from '@testing-library/react-hooks';
import { discoverServiceMock } from '../../../__mocks__/services';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { getDiscoverStateMock } from '../../../__mocks__/discover_state.mock';

describe('test useSearchSession', () => {
  test('getting the next session id', async () => {
    const stateContainer = getDiscoverStateMock({
      savedSearch: savedSearchMock,
    });

    const nextId = 'id';
    discoverServiceMock.data.search.session.start = jest.fn(() => nextId);

    renderHook(() => {
      return useSearchSession({
        services: discoverServiceMock,
        stateContainer,
      });
    });
    expect(stateContainer.searchSessionManager.getNextSearchSessionId()).toBe('id');
  });
});
