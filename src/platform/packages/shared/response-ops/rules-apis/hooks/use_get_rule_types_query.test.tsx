/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor, renderHook } from '@testing-library/react';
import { useGetRuleTypesQuery } from './use_get_rule_types_query';
import type { RuleType } from '@kbn/triggers-actions-ui-types';
import { getRuleTypes } from '../apis/get_rule_types';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

const mockRuleTypes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as unknown as RuleType[];

jest.mock('../apis/get_rule_types');
const mockGetRuleTypes = jest.mocked(getRuleTypes);

const http = httpServiceMock.createStartContract();

const { queryClient, provider: wrapper } = createTestResponseOpsQueryClient();

describe('useGetRuleTypesQuery', () => {
  beforeEach(() => {
    mockGetRuleTypes.mockResolvedValue(mockRuleTypes);
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('should call the getRuleTypes API', async () => {
    const { result } = renderHook(
      () =>
        useGetRuleTypesQuery(
          {
            http,
          },
          { enabled: true }
        ),
      {
        wrapper,
      }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetRuleTypes).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockRuleTypes);
  });
});
