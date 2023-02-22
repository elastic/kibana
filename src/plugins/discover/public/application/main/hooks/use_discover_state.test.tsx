/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { discoverServiceMock } from '../../../__mocks__/services';
import { useDiscoverState } from './use_discover_state';
import { setUrlTracker } from '../../../kibana_services';
import { urlTrackerMock } from '../../../__mocks__/url_tracker.mock';
import { DiscoverMainProvider } from '../services/discover_state_provider';
import { getDiscoverStateMock } from '../../../__mocks__/discover_state.mock';
setUrlTracker(urlTrackerMock);

describe('test useDiscoverState', () => {
  test('return is valid', async () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });

    const { result } = renderHook(
      () => {
        return useDiscoverState({
          services: discoverServiceMock,
          stateContainer,
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
  });
});
