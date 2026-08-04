/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { esql } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import { useDiscoverLinkAndEsqlQuery } from '.';
import { useGetGenerateDiscoverLink } from '../use_generate_discover_link';

jest.mock('../use_generate_discover_link', () => ({
  useGetGenerateDiscoverLink: jest.fn(),
}));

const expectedQuery = (
  indexPattern: string,
  whereClause: ESQLAstExpression,
  unmappedFieldsPolicy?: 'NULLIFY' | 'LOAD'
): string => {
  const query = esql.from(indexPattern);
  if (unmappedFieldsPolicy) {
    query.addSetCommand('unmapped_fields', unmappedFieldsPolicy);
  }
  query.where`${whereClause}`;
  return query.print('pipe-multiline');
};

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

  it('returns the raw esqlQueryString without SET prefix when no unmappedFieldsPolicy is provided', () => {
    const DISCOVER_URL = 'http://discover/url';
    const generateDiscoverLink = jest.fn(() => DISCOVER_URL);
    mockUseGetGenerateDiscoverLink.mockReturnValue({ generateDiscoverLink });

    const indexPattern = 'traces-*';
    const whereClause = esql.exp`${esql.col('trace.id')} == ${esql.str('abc123')}`;

    const { result } = renderHook(() => useDiscoverLinkAndEsqlQuery({ indexPattern, whereClause }));

    expect(generateDiscoverLink).toHaveBeenCalledWith(whereClause);
    expect(result.current.discoverUrl).toBe(DISCOVER_URL);
    expect(result.current.esqlQueryString).not.toContain('SET unmapped_fields');
    expect(result.current.esqlQueryString).toBe(expectedQuery(indexPattern, whereClause));
  });

  it('prepends the SET directive when unmappedFieldsPolicy is provided', () => {
    const DISCOVER_URL = 'http://discover/url';
    const generateDiscoverLink = jest.fn(() => DISCOVER_URL);
    mockUseGetGenerateDiscoverLink.mockReturnValue({ generateDiscoverLink });

    const indexPattern = 'logs-*';
    const whereClause = esql.exp`${esql.col('trace.id')} == ${esql.str('abc123')}`;

    const { result } = renderHook(() =>
      useDiscoverLinkAndEsqlQuery({ indexPattern, whereClause, unmappedFieldsPolicy: 'NULLIFY' })
    );

    expect(result.current.esqlQueryString).toBe(
      expectedQuery(indexPattern, whereClause, 'NULLIFY')
    );
    expect(result.current.esqlQueryString).toContain('SET unmapped_fields = "NULLIFY";');
  });

  it('nullifies unmapped error.* columns in the in-tab query (#281060)', () => {
    const generateDiscoverLink = jest.fn(() => 'http://discover/url');
    mockUseGetGenerateDiscoverLink.mockReturnValue({ generateDiscoverLink });

    const indexPattern = 'logs-*';
    const whereClause = esql.exp`${esql.col('service.name')} == ${esql.str(
      'payment'
    )} AND ${esql.col('error.culprit')} == ${esql.str('charge')}`;

    const { result } = renderHook(() =>
      useDiscoverLinkAndEsqlQuery({ indexPattern, whereClause, unmappedFieldsPolicy: 'NULLIFY' })
    );

    expect(result.current.esqlQueryString).toBe(
      'SET unmapped_fields = "NULLIFY"; FROM logs-*\n  | WHERE `service.name` == "payment" AND `error.culprit` == "charge"'
    );
  });
});
