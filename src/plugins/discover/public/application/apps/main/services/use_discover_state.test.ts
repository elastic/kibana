/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { createSearchSessionMock } from '../../../../__mocks__/search_session';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { useDiscoverState } from './use_discover_state';
import { indexPatternMock } from '../../../../__mocks__/index_pattern';
import { SearchSource } from '../../../../../../data/common';

describe('test useDiscoverState', () => {
  test('return is valid', async () => {
    const { history } = createSearchSessionMock();

    const { result } = renderHook(() => {
      return useDiscoverState({
        services: discoverServiceMock,
        history,
        savedSearch: savedSearchMock,
      });
    });
    expect(result.current.state.index).toBe(indexPatternMock.id);
    expect(result.current.stateContainer).toBeInstanceOf(Object);
    expect(result.current.setState).toBeInstanceOf(Function);
    expect(result.current.searchSource).toBeInstanceOf(SearchSource);
  });

  test('setState', async () => {
    const { history } = createSearchSessionMock();

    const { result } = renderHook(() => {
      return useDiscoverState({
        services: discoverServiceMock,
        history,
        savedSearch: savedSearchMock,
      });
    });
    await act(async () => {
      result.current.setState({ columns: ['123'] });
    });
    expect(result.current.state.columns).toEqual(['123']);
  });

  test('resetSavedSearch', async () => {
    const { history } = createSearchSessionMock();

    const { result, waitForValueToChange } = renderHook(() => {
      return useDiscoverState({
        services: discoverServiceMock,
        history,
        savedSearch: savedSearchMock,
      });
    });

    const initialColumns = result.current.state.columns;
    await act(async () => {
      result.current.setState({ columns: ['123'] });
    });
    expect(result.current.state.columns).toEqual(['123']);

    result.current.resetSavedSearch('the-saved-search-id');
    await waitForValueToChange(() => {
      return result.current.state;
    });

    expect(result.current.state.columns).toEqual(initialColumns);
  });
});
