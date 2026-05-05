/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { from, where } from '@kbn/esql-composer';
import { useDiscoverLinkAndEsqlQuery } from '.';
import { useGetGenerateDiscoverLink } from '../use_generate_discover_link';

jest.mock('../use_generate_discover_link', () => ({
  useGetGenerateDiscoverLink: jest.fn(),
}));

describe('useDiscoverLinkAndEsqlQuery', () => {
  const mockUseGetGenerateDiscoverLink = jest.mocked(useGetGenerateDiscoverLink);

  beforeEach(() => {
    mockUseGetGenerateDiscoverLink.mockReset();
  });

  it('returns undefined values when indexPattern or whereClause are missing', () => {
    const generateDiscoverLink = jest.fn(() => 'http://discover/url');
    mockUseGetGenerateDiscoverLink.mockReturnValue({ generateDiscoverLink });

    const { result } = renderHook(() =>
      useDiscoverLinkAndEsqlQuery({ indexPattern: undefined, whereClause: undefined })
    );

    expect(result.current).toEqual({ discoverUrl: undefined, esqlQueryString: undefined });
    expect(generateDiscoverLink).not.toHaveBeenCalled();
  });

  it('returns discoverUrl and esqlQueryString when inputs are provided', () => {
    const DISCOVER_URL = 'http://discover/url';
    const generateDiscoverLink = jest.fn(() => DISCOVER_URL);
    mockUseGetGenerateDiscoverLink.mockReturnValue({ generateDiscoverLink });

    const indexPattern = 'traces-*';
    const whereClause = where('trace.id == ?traceId', { traceId: 'abc123' });

    const { result } = renderHook(() => useDiscoverLinkAndEsqlQuery({ indexPattern, whereClause }));

    expect(generateDiscoverLink).toHaveBeenCalledWith(whereClause);
    expect(result.current.discoverUrl).toBe(DISCOVER_URL);
    expect(result.current.esqlQueryString).toBe(from(indexPattern).pipe(whereClause).toString());
  });
});
