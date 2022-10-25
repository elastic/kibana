/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { discoverServiceMock } from '../../../__mocks__/services';
import { useDiscoverState } from './use_discover_state';
import { setUrlTracker } from '../../../kibana_services';
import { urlTrackerMock } from '../../../__mocks__/url_tracker.mock';
import { getDiscoverStateMock } from '../../../__mocks__/discover_state.mock';
import React, { ReactElement } from 'react';
import { DiscoverMainProvider } from '../services/discover_state_react';
import { dataViewMock } from '../../../__mocks__/data_view';
setUrlTracker(urlTrackerMock);

describe('test useDiscoverState', () => {
  test('return is valid', async () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.internalState.transitions.setDataView(dataViewMock);

    const { result } = renderHook(
      () => {
        return useDiscoverState({
          services: discoverServiceMock,
          setExpandedDoc: jest.fn(),
          stateContainer,
        });
      },
      {
        wrapper: ({ children }: { children: ReactElement }) => (
          <DiscoverMainProvider value={stateContainer}>{children}</DiscoverMainProvider>
        ),
      }
    );
    expect(result.current.adHocDataViewList).toBeInstanceOf(Object);
  });
});
