/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { renderHook } from '@testing-library/react-hooks';
import { createSearchSessionMock } from '../../../__mocks__/search_session';
import { useUrl } from './use_url';
import { getDiscoverStateMock } from '../../../__mocks__/discover_state.mock';

describe('test useUrl', () => {
  test('resetSavedSearch is triggered once path it changed to /', () => {
    const { history } = createSearchSessionMock();
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    history.push('/view');
    const reset = jest.fn();
    stateContainer.savedSearchState.reset = reset;
    const props = {
      history,
      stateContainer,
    };
    renderHook(() => useUrl(props));
    history.push('/new');
    expect(reset).toHaveBeenCalledTimes(0);
    history.push('/');
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
