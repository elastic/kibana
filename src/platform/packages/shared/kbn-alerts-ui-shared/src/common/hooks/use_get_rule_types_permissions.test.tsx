/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { notificationServiceMock } from '@kbn/core/public/mocks';
import { renderHook, waitFor } from '@testing-library/react';
import type { Alert } from '@kbn/alerting-types';
import { ALERT_RULE_CONSUMER, ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { useGetRuleTypesPermissions } from './use_get_rule_types_permissions';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { testQueryClientConfig } from '../test_utils/test_query_client_config';

const buildAlert = (fields: { ruleTypeId?: string; consumer?: string }): Alert =>
  ({
    _id: 'alert-1',
    _index: '.alerts',
    ...(fields.ruleTypeId ? { [ALERT_RULE_TYPE_ID]: [fields.ruleTypeId] } : {}),
    ...(fields.consumer ? { [ALERT_RULE_CONSUMER]: [fields.consumer] } : {}),
  } as Alert);

const http = httpServiceMock.createStartContract();
const { toasts } = notificationServiceMock.createStartContract();

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

const queryClient = new QueryClient(testQueryClientConfig);
const Wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useGetRuleTypesPermissions', () => {
  afterEach(() => {
    queryClient.clear();
  });

  it('should not filter the rule types if `filteredRuleTypes` and `registeredRuleTypes` are not defined', async () => {
    const { result } = renderHook(
      () =>
        useGetRuleTypesPermissions({
          http,
          toasts,
          enabled: true,
        }),
      {
        wrapper: Wrapper,
      }
    );
    await waitFor(() => result.current.isSuccess);
    expect(result.current.ruleTypesState.data.size).toBe(2);
    expect(result.current.authorizedRuleTypes.length).toBe(2);
  });

  it('should filter the rule types according to `filteredRuleTypes`', async () => {
    const { result } = renderHook(
      () =>
        useGetRuleTypesPermissions({
          http,
          toasts,
          enabled: true,
          filteredRuleTypes: ['rule-type-1'],
        }),
      {
        wrapper: Wrapper,
      }
    );
    await waitFor(() => result.current.isSuccess);
    expect(result.current.ruleTypesState.data.size).toBe(1);
    expect(result.current.authorizedRuleTypes.length).toBe(1);
    expect(result.current.ruleTypesState.data.keys().next().value).toBe('rule-type-1');
  });

  it('should filter out rule types not present in `registeredRuleTypes`', async () => {
    const { result } = renderHook(
      () =>
        useGetRuleTypesPermissions({
          http,
          toasts,
          enabled: true,
          registeredRuleTypes: [{ id: 'rule-type-1', description: '' }],
        }),
      {
        wrapper: Wrapper,
      }
    );
    await waitFor(() => result.current.isSuccess);
    expect(result.current.ruleTypesState.data.size).toBe(1);
    expect(result.current.authorizedRuleTypes.length).toBe(1);
    expect(result.current.ruleTypesState.data.keys().next().value).toBe('rule-type-1');
  });

  it('should return the correct authz flags when no rule types are accessible', async () => {
    getRuleTypes.mockResolvedValueOnce([]);
    const { result } = renderHook(
      () =>
        useGetRuleTypesPermissions({
          http,
          toasts,
          enabled: true,
        }),
      {
        wrapper: Wrapper,
      }
    );
    await waitFor(() => result.current.isSuccess);
    expect(result.current.ruleTypesState.data.size).toBe(0);
    expect(result.current.hasAnyAuthorizedRuleType).toBe(false);
    expect(result.current.authorizedToReadAnyRules).toBe(false);
    expect(result.current.authorizedToCreateAnyRules).toBe(false);
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
          toasts,
          enabled: true,
        }),
      {
        wrapper: Wrapper,
      }
    );
    await waitFor(() => result.current.isSuccess);
    expect(result.current.ruleTypesState.data.size).toBe(1);
    expect(result.current.hasAnyAuthorizedRuleType).toBe(true);
    expect(result.current.authorizedToReadAnyRules).toBe(true);
    expect(result.current.authorizedToCreateAnyRules).toBe(false);
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
          toasts,
          enabled: true,
        }),
      {
        wrapper: Wrapper,
      }
    );
    await waitFor(() => result.current.isSuccess);
    expect(result.current.ruleTypesState.data.size).toBe(1);
    expect(result.current.hasAnyAuthorizedRuleType).toBe(true);
    expect(result.current.authorizedToReadAnyRules).toBe(true);
    expect(result.current.authorizedToCreateAnyRules).toBe(true);
  });

  describe('authorizedToReadRuleType', () => {
    it('should return true for a readable rule type and false for an unknown rule type', async () => {
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
            toasts,
            enabled: true,
          }),
        {
          wrapper: Wrapper,
        }
      );
      await waitFor(() => result.current.isSuccess);
      expect(result.current.authorizedToReadRuleType('rule-type-1')).toBe(true);
      expect(result.current.authorizedToReadRuleType('unknown-rule-type')).toBe(false);
    });

    it('should respect the consumer argument when provided', async () => {
      getRuleTypes.mockResolvedValueOnce([
        {
          id: 'rule-type-1',
          authorizedConsumers: {
            alerts: { read: true, all: false },
            logs: { read: false, all: false },
          },
        },
      ]);
      const { result } = renderHook(
        () =>
          useGetRuleTypesPermissions({
            http,
            toasts,
            enabled: true,
          }),
        {
          wrapper: Wrapper,
        }
      );
      await waitFor(() => result.current.isSuccess);
      // Authorized under the `alerts` consumer
      expect(result.current.authorizedToReadRuleType('rule-type-1', 'alerts')).toBe(true);
      // Present but not readable under the `logs` consumer
      expect(result.current.authorizedToReadRuleType('rule-type-1', 'logs')).toBe(false);
      // A consumer the user is not authorized for is denied (strict per-consumer
      // check), even though another consumer is readable.
      expect(result.current.authorizedToReadRuleType('rule-type-1', 'unknown-consumer')).toBe(
        false
      );
    });
  });

  describe('authorizedToReadRuleForAlert', () => {
    it('should return true when the alert rule type and consumer are readable', async () => {
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
            toasts,
            enabled: true,
          }),
        {
          wrapper: Wrapper,
        }
      );
      await waitFor(() => result.current.isSuccess);
      expect(
        result.current.authorizedToReadRuleForAlert(
          buildAlert({ ruleTypeId: 'rule-type-1', consumer: 'alerts' })
        )
      ).toBe(true);
    });

    it('should return false when the alert consumer is not readable for the rule type', async () => {
      getRuleTypes.mockResolvedValueOnce([
        {
          id: 'rule-type-1',
          authorizedConsumers: {
            alerts: { read: true, all: false },
            logs: { read: false, all: false },
          },
        },
      ]);
      const { result } = renderHook(
        () =>
          useGetRuleTypesPermissions({
            http,
            toasts,
            enabled: true,
          }),
        {
          wrapper: Wrapper,
        }
      );
      await waitFor(() => result.current.isSuccess);
      expect(
        result.current.authorizedToReadRuleForAlert(
          buildAlert({ ruleTypeId: 'rule-type-1', consumer: 'logs' })
        )
      ).toBe(false);
    });

    it('should return false when the alert has no rule type id', async () => {
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
            toasts,
            enabled: true,
          }),
        {
          wrapper: Wrapper,
        }
      );
      await waitFor(() => result.current.isSuccess);
      expect(result.current.authorizedToReadRuleForAlert(buildAlert({ consumer: 'alerts' }))).toBe(
        false
      );
    });

    it('should fall back to any authorized consumer when the alert has no consumer', async () => {
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
            toasts,
            enabled: true,
          }),
        {
          wrapper: Wrapper,
        }
      );
      await waitFor(() => result.current.isSuccess);
      expect(
        result.current.authorizedToReadRuleForAlert(buildAlert({ ruleTypeId: 'rule-type-1' }))
      ).toBe(true);
    });
  });
});
