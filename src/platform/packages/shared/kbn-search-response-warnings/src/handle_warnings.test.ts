/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { estypes } from '@elastic/elasticsearch';
import { coreMock } from '@kbn/core/public/mocks';
import type { Start as InspectorStart, RequestAdapter } from '@kbn/inspector-plugin/public';
import { handleWarnings } from './handle_warnings';

describe('handleWarnings', () => {
  const coreStart = coreMock.createStart();
  const addWarningSpy = jest.spyOn(coreStart.notifications.toasts, 'addWarning');

  beforeEach(() => {
    addWarningSpy.mockClear();
  });

  it('should not show notifications when there are no warnings', () => {
    handleWarnings({
      request: {} as unknown as estypes.SearchRequest,
      requestAdapter: {} as unknown as RequestAdapter,
      requestId: '1234',
      requestName: 'My request',
      response: {
        timed_out: false,
        _shards: {
          failed: 0,
          total: 9000,
        },
      } as estypes.SearchResponse,
      services: {
        inspector: {} as unknown as InspectorStart,
        ...coreStart,
      },
    });

    expect(addWarningSpy).toBeCalledTimes(0);
  });

  it('should show notifications for warnings when there is no callback', () => {
    handleWarnings({
      request: {} as unknown as estypes.SearchRequest,
      requestAdapter: {} as unknown as RequestAdapter,
      requestId: '1234',
      requestName: 'My request',
      response: {
        took: 999,
        timed_out: true,
        _shards: {} as estypes.ShardStatistics,
        hits: { hits: [] },
      } as estypes.SearchResponse,
      services: {
        inspector: {} as unknown as InspectorStart,
        ...coreStart,
      },
    });

    expect(addWarningSpy).toBeCalledTimes(1);
  });

  it('should show notifications for warnings not handled by callback', () => {
    const callbackMock = jest.fn(() => false);
    handleWarnings({
      callback: callbackMock,
      request: {} as unknown as estypes.SearchRequest,
      requestAdapter: {} as unknown as RequestAdapter,
      requestId: '1234',
      requestName: 'My request',
      response: {
        took: 999,
        timed_out: true,
        _shards: {} as estypes.ShardStatistics,
        hits: { hits: [] },
      } as estypes.SearchResponse,
      services: {
        inspector: {} as unknown as InspectorStart,
        ...coreStart,
      },
    });

    expect(callbackMock).toBeCalledTimes(1);
    expect(addWarningSpy).toBeCalledTimes(1);
  });

  it('should not show notifications for warnings handled by callback', () => {
    const callbackMock = jest.fn(() => true);
    handleWarnings({
      callback: callbackMock,
      request: {} as unknown as estypes.SearchRequest,
      requestAdapter: {} as unknown as RequestAdapter,
      requestId: '1234',
      requestName: 'My request',
      response: {
        took: 999,
        timed_out: true,
        _shards: {} as estypes.ShardStatistics,
        hits: { hits: [] },
      } as estypes.SearchResponse,
      services: {
        inspector: {} as unknown as InspectorStart,
        ...coreStart,
      },
    });

    expect(callbackMock).toBeCalledTimes(1);
    expect(addWarningSpy).toBeCalledTimes(0);
  });
});
