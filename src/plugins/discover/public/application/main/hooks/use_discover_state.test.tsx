/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { SearchSource } from '@kbn/data-plugin/public';
import { createSearchSessionMock } from '../../../__mocks__/search_session';
import { discoverServiceMock } from '../../../__mocks__/services';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { useDiscoverState } from './use_discover_state';
import { setUrlTracker } from '../../../kibana_services';
import { urlTrackerMock } from '../../../__mocks__/url_tracker.mock';
import { DiscoverMainProvider } from '../services/discover_state_provider';
import { getDiscoverStateMock } from '../../../__mocks__/discover_state.mock';
setUrlTracker(urlTrackerMock);

describe('test useDiscoverState', () => {
  test('return is valid', async () => {
    const { history } = createSearchSessionMock();
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });

    const { result } = renderHook(
      () => {
        return useDiscoverState({
          services: discoverServiceMock,
          history,
          savedSearch: savedSearchMock,
          setExpandedDoc: jest.fn(),
        });
      },
      {
        wrapper: ({ children }: { children: React.ReactElement }) => (
          <DiscoverMainProvider value={stateContainer}>{children}</DiscoverMainProvider>
        ),
      }
    );
    expect(result.current.stateContainer).toBeInstanceOf(Object);
    expect(result.current.searchSource).toBeInstanceOf(SearchSource);
  });
});
