/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { createSearchSessionMock } from '../../../__mocks__/search_session';
import { discoverServiceMock } from '../../../__mocks__/services';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { useDiscoverState } from './use_discover_state';

describe('test useDiscoverState', () => {
  const originalSavedObjectsClient = discoverServiceMock.core.savedObjects.client;

  beforeAll(() => {
    discoverServiceMock.core.savedObjects.client.resolve = jest.fn().mockReturnValue({
      saved_object: {
        attributes: {},
      },
    });
  });

  afterAll(() => {
    discoverServiceMock.core.savedObjects.client = originalSavedObjectsClient;
  });

  test('return is valid', async () => {
    const { history } = createSearchSessionMock();

    const { result } = renderHook(() => {
      return useDiscoverState({
        services: discoverServiceMock,
        history,
        initialSavedSearch: savedSearchMock,
        setExpandedDoc: jest.fn(),
      });
    });
    expect(result.current.savedSearch.id).toBe(savedSearchMock.id);
    expect(result.current.stateContainer).toBeInstanceOf(Object);
  });
});
