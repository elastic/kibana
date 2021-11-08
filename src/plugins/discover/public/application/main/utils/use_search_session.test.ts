/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useSearchSession } from './use_search_session';
import { renderHook } from '@testing-library/react-hooks';
import { createSearchSessionMock } from '../../../__mocks__/search_session';
import { discoverServiceMock } from '../../../__mocks__/services';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { getState } from '../services/discover_state';
import { uiSettingsMock } from '../../../__mocks__/ui_settings';

describe('test useSearchSession', () => {
  test('getting the next session id', async () => {
    const { history } = createSearchSessionMock();
    const stateContainer = getState({
      getStateDefaults: () => ({ index: 'test' }),
      history,
      uiSettings: uiSettingsMock,
    });

    const nextId = 'id';
    discoverServiceMock.data.search.session.start = jest.fn(() => nextId);

    const { result } = renderHook(() => {
      return useSearchSession({
        services: discoverServiceMock,
        history,
        stateContainer,
        savedSearch: savedSearchMock,
      });
    });
    expect(result.current.getNextSearchSessionId()).toBe('id');
  });
});
