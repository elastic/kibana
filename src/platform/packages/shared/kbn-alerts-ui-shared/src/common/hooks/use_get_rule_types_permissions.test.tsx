/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { renderHook, waitFor } from '@testing-library/react';
import { useGetRuleTypesPermissions } from './use_get_rule_types_permissions';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

const http = httpServiceMock.createStartContract();

jest.mock('@kbn/response-ops-rules-apis/apis/get_rule_types');
const { getRuleTypes } = jest.requireMock('@kbn/response-ops-rules-apis/apis/get_rule_types');
getRuleTypes.mockResolvedValue([
  {
    id: 'rule-type-1',
    authorizedConsumers: {},
  },
  {
    id: 'rule-type-2',
    authorizedConsumers: {},
  },
]);

const { queryClient, provider: wrapper } = createTestResponseOpsQueryClient();

describe('useGetRuleTypesPermissions', () => {
  afterEach(() => {
    queryClient.clear();
  });

  it('should not filter the rule types if `filteredRuleTypes` and `registeredRuleTypes` are not defined', async () => {
    const { result } = renderHook(
      () =>
        useGetRuleTypesPermissions({
          http,
          enabled: true,
        }),
      {
        wrapper,
      }
    );
    await waitFor(() => {
      expect(result.current.ruleTypesState.data.size).toBe(2);
      expect(result.current.authorizedRuleTypes.length).toBe(2);
    });
  });

  it('should filter the rule types according to `filteredRuleTypes`', async () => {
    const { result } = renderHook(
      () =>
        useGetRuleTypesPermissions({
          http,
          enabled: true,
          filteredRuleTypes: ['rule-type-1'],
        }),
      {
        wrapper,
      }
    );
    await waitFor(() => {
      expect(result.current.ruleTypesState.data.size).toBe(1);
      expect(result.current.authorizedRuleTypes.length).toBe(1);
      expect(result.current.ruleTypesState.data.keys().next().value).toBe('rule-type-1');
    });
  });

  it('should filter out rule types not present in `registeredRuleTypes`', async () => {
    const { result } = renderHook(
      () =>
        useGetRuleTypesPermissions({
          http,
          enabled: true,
          registeredRuleTypes: [{ id: 'rule-type-1', description: '' }],
        }),
      {
        wrapper,
      }
    );
    await waitFor(() => {
      expect(result.current.ruleTypesState.data.size).toBe(1);
      expect(result.current.authorizedRuleTypes.length).toBe(1);
      expect(result.current.ruleTypesState.data.keys().next().value).toBe('rule-type-1');
    });
  });

  it('should return the correct authz flags when no rule types are accessible', async () => {
    getRuleTypes.mockResolvedValueOnce([]);
    const { result } = renderHook(
      () =>
        useGetRuleTypesPermissions({
          http,
          enabled: true,
        }),
      {
        wrapper,
      }
    );
    await waitFor(() => {
      expect(result.current.ruleTypesState.data.size).toBe(0);
      expect(result.current.hasAnyAuthorizedRuleType).toBe(false);
      expect(result.current.authorizedToReadAnyRules).toBe(false);
      expect(result.current.authorizedToCreateAnyRules).toBe(false);
    });
  });

  it('should return the correct authz flags for read-only rule types', async () => {
    getRuleTypes.mockResolvedValueOnce([
      {
        id: 'rule-type-1',
        authorizedConsumers: { alerts: { read: true, all: false } },
      },
    ]);
    const { result } = renderHook(
      () =>
        useGetRuleTypesPermissions({
          http,
          enabled: true,
        }),
      {
        wrapper,
      }
    );
    await waitFor(() => {
      expect(result.current.ruleTypesState.data.size).toBe(1);
      expect(result.current.hasAnyAuthorizedRuleType).toBe(true);
      expect(result.current.authorizedToReadAnyRules).toBe(true);
      expect(result.current.authorizedToCreateAnyRules).toBe(false);
    });
  });

  it('should return the correct authz flags for read+write rule types', async () => {
    getRuleTypes.mockResolvedValueOnce([
      {
        id: 'rule-type-1',
        authorizedConsumers: { alerts: { read: true, all: true } },
      },
    ]);
    const { result } = renderHook(
      () =>
        useGetRuleTypesPermissions({
          http,
          enabled: true,
        }),
      {
        wrapper,
      }
    );
    await waitFor(() => {
      expect(result.current.ruleTypesState.data.size).toBe(1);
      expect(result.current.hasAnyAuthorizedRuleType).toBe(true);
      expect(result.current.authorizedToReadAnyRules).toBe(true);
      expect(result.current.authorizedToCreateAnyRules).toBe(true);
    });
  });
});
