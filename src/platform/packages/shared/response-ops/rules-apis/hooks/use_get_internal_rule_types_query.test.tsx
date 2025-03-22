/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { PropsWithChildren } from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetInternalRuleTypesQuery } from './use_get_internal_rule_types_query';
import { InternalRuleType, getInternalRuleTypes } from '../apis/get_internal_rule_types';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { testQueryClientConfig } from '../test_utils';

const mockInternalRuleTypes = [
  { id: 'a' },
  { id: 'b' },
  { id: 'c' },
] as unknown as InternalRuleType[];

jest.mock('../apis/get_internal_rule_types');
const mockGetInternalRuleTypes = jest.mocked(getInternalRuleTypes);

const http = httpServiceMock.createStartContract();

const queryClient = new QueryClient(testQueryClientConfig);

export const Wrapper = ({ children }: PropsWithChildren) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('useGetInternalRuleTypesQuery', () => {
  beforeEach(() => {
    mockGetInternalRuleTypes.mockResolvedValue(mockInternalRuleTypes);
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('should call the getInternalRuleTypes API', async () => {
    const { result } = renderHook(
      () =>
        useGetInternalRuleTypesQuery({
          http,
        }),
      {
        wrapper: Wrapper,
      }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetInternalRuleTypes).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockInternalRuleTypes);
  });
});
