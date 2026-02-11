/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useGetGenerateDiscoverLink } from '.';

jest.mock('../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

const DISCOVER_URL = 'http://discover/url';

describe('useGetGenerateDiscoverLink', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mockGetUnifiedDocViewerServices = require('../../plugin').getUnifiedDocViewerServices;
  const mockDiscoverLocator = {
    getRedirectUrl: jest.fn(() => DISCOVER_URL),
  };

  beforeEach(() => {
    mockGetUnifiedDocViewerServices.mockReturnValue({
      data: {
        query: {
          timefilter: {
            timefilter: { getAbsoluteTime: jest.fn(() => ({ from: 'now-15m', to: 'now' })) },
          },
        },
      },
      share: {
        url: {
          locators: {
            get: jest.fn((key: string) =>
              key === 'DISCOVER_APP_LOCATOR' ? mockDiscoverLocator : undefined
            ),
          },
        },
      },
    });
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('returns undefined if discoverLocator is missing', () => {
    mockGetUnifiedDocViewerServices.mockReturnValueOnce({
      data: {
        query: {
          timefilter: {
            timefilter: { getAbsoluteTime: jest.fn(() => ({ from: 'now-15m', to: 'now' })) },
          },
        },
      },
      share: { url: { locators: { get: jest.fn(() => undefined) } } },
    });

    const { result } = renderHook(() => useGetGenerateDiscoverLink({ indexPattern: 'traces-*' }));
    expect(result.current.generateDiscoverLink()).toBeUndefined();
  });

  it('returns undefined if indexPattern is missing', () => {
    const { result } = renderHook(() => useGetGenerateDiscoverLink({}));
    expect(result.current.generateDiscoverLink()).toBeUndefined();
  });

  it('generates a discover link with no whereClause', () => {
    const { result } = renderHook(() => useGetGenerateDiscoverLink({ indexPattern: 'traces-*' }));
    const url = result.current.generateDiscoverLink();
    expect(url).toBe(DISCOVER_URL);
    expect(mockDiscoverLocator.getRedirectUrl).toHaveBeenCalled();
  });

  it('generates a discover link with whereClause and params', () => {
    const { result } = renderHook(() => useGetGenerateDiscoverLink({ indexPattern: 'traces-*' }));
    const url = result.current.generateDiscoverLink({ 'service.name': 1 });
    expect(url).toBe(DISCOVER_URL);
    expect(mockDiscoverLocator.getRedirectUrl).toHaveBeenCalled();
  });

  it('filters out undefined values from whereClause to avoid invalid ESQL parameters', () => {
    const { result } = renderHook(() => useGetGenerateDiscoverLink({ indexPattern: 'traces-*' }));
    const mockGetRedirectUrl = jest.fn(() => DISCOVER_URL);
    mockDiscoverLocator.getRedirectUrl = mockGetRedirectUrl;

    result.current.generateDiscoverLink({
      'trace.id': 'abc123',
      'span.id': undefined,
      'event.name': undefined,
      'exception.message': 'Test error',
    });

    expect(mockGetRedirectUrl).toHaveBeenCalled();
    const esql = (mockGetRedirectUrl.mock.calls[0] as any)?.[0]?.query?.esql;

    expect(esql).toBe(`FROM traces-*
  | WHERE trace.id == "abc123" AND exception.message == "Test error"`);
  });
});
