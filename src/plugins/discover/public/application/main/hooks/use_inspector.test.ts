/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { discoverServiceMock } from '../../../__mocks__/services';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { useInspector } from './use_inspector';
import { Adapters, RequestAdapter } from '@kbn/inspector-plugin/common';
import { OverlayRef } from '@kbn/core/public';
import { AggregateRequestAdapter } from '../utils/aggregate_request_adapter';

describe('test useInspector', () => {
  test('inspector open function is executed, expanded doc is closed', async () => {
    const setExpandedDoc = jest.fn();
    let adapters: Adapters | undefined;
    jest.spyOn(discoverServiceMock.inspector, 'open').mockImplementation((localAdapters) => {
      adapters = localAdapters;
      return {} as OverlayRef;
    });
    const requests = new RequestAdapter();
    const lensRequests = new RequestAdapter();
    const { result } = renderHook(() => {
      return useInspector({
        inspectorAdapters: { requests, lensRequests },
        savedSearch: savedSearchMock,
        inspector: discoverServiceMock.inspector,
        setExpandedDoc,
      });
    });
    result.current();
    expect(setExpandedDoc).toHaveBeenCalledWith(undefined);
    expect(discoverServiceMock.inspector.open).toHaveBeenCalled();
    expect(adapters?.requests).toBeInstanceOf(AggregateRequestAdapter);
    expect(adapters?.requests?.getRequests()).toEqual([
      ...requests.getRequests(),
      ...lensRequests.getRequests(),
    ]);
  });
});
