/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { where } from '@kbn/esql-composer';
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
    expect(result.current.esqlQueryString).toBe(
      'SET unmapped_fields="nullify"; FROM traces-* | WHERE trace.id == "abc123"'
    );
  });

  it('prepends the unmapped_fields nullify SET command as a single line so unmapped columns do not fail', () => {
    const generateDiscoverLink = jest.fn(() => 'http://discover/url');
    mockUseGetGenerateDiscoverLink.mockReturnValue({ generateDiscoverLink });

    const indexPattern = 'logs-*';
    const whereClause = where('error.culprit == ?culprit', { culprit: 'Main.Cache.func3' });

    const { result } = renderHook(() => useDiscoverLinkAndEsqlQuery({ indexPattern, whereClause }));

    const esqlQueryString = result.current.esqlQueryString;

    // Discover drops the header command when the query is multi-line, so it must
    // be emitted as a single line to survive the "Open in Discover tab" action.
    expect(esqlQueryString?.startsWith('SET unmapped_fields="nullify"; ')).toBe(true);
    expect(esqlQueryString).not.toContain('\n');
    expect(esqlQueryString).toContain('FROM logs-*');
    expect(esqlQueryString).toContain('error.culprit == "Main.Cache.func3"');
  });

  it('prepends SET directive when unmappedFieldsPolicy is provided', () => {
    const DISCOVER_URL = 'http://discover/url';
    const generateDiscoverLink = jest.fn(() => DISCOVER_URL);
    mockUseGetGenerateDiscoverLink.mockReturnValue({ generateDiscoverLink });

    const indexPattern = 'logs-*';
    const whereClause = where('trace.id == ?traceId', { traceId: 'abc123' });

    const { result } = renderHook(() =>
      useDiscoverLinkAndEsqlQuery({ indexPattern, whereClause, unmappedFieldsPolicy: 'NULLIFY' })
    );

    expect(result.current.esqlQueryString).toBe(
      `SET unmapped_fields = "NULLIFY";\n${from(indexPattern).pipe(whereClause).toString()}`
    );
  });
});
