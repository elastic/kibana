/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks/dom';
import { waitFor } from '@testing-library/react';
import type { HttpStart } from '@kbn/core-http-browser';

import { useCreateRule } from './use_create_rule';
import { CreateRuleBody } from '../apis/create_rule';
import { RuleTypeParams } from '../types';

const ruleToCreate: CreateRuleBody<RuleTypeParams> = {
  params: {
    aggType: 'count',
    termSize: 5,
    thresholdComparator: '>',
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    groupBy: 'all',
    threshold: [1000],
    index: ['.kibana'],
    timeField: 'alert.executionStatus.lastExecutionDate',
  },
  consumer: 'alerts',
  schedule: { interval: '1m' },
  tags: [],
  name: 'test',
  enabled: true,
  throttle: null,
  ruleTypeId: '.index-threshold',
  actions: [
    {
      group: 'threshold met',
      id: '83d4d860-9316-11eb-a145-93ab369a4461',
      params: {
        level: 'info',
        message: 'test-message',
      },
      actionTypeId: '.server-log',
      frequency: {
        notifyWhen: 'onActionGroupChange',
        throttle: null,
        summary: false,
      },
      useAlertDataForTemplate: true,
    },
    {
      id: '.test-system-action',
      params: {},
      actionTypeId: '.system-action',
    },
  ],
  notifyWhen: 'onActionGroupChange',
  alertDelay: {
    active: 10,
  },
};

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

jest.mock('../apis/create_rule/create_rule', () => ({
  createRule: jest.fn(),
}));

const { createRule } = jest.requireMock('../apis/create_rule/create_rule');

const httpMock = jest.fn();
const onSuccessMock = jest.fn();
const onErrorMock = jest.fn();

describe('useCreateRule', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should call onSuccess if request succeeds', async () => {
    createRule.mockResolvedValueOnce({});

    const { result } = renderHook(
      () => {
        return useCreateRule({
          http: httpMock as unknown as HttpStart,
          onSuccess: onSuccessMock,
          onError: onErrorMock,
        });
      },
      { wrapper }
    );

    result.current.mutate({ formData: ruleToCreate });

    await waitFor(() => {
      return expect(createRule).toHaveBeenCalledWith({ http: httpMock, rule: ruleToCreate });
    });

    expect(onSuccessMock).toHaveBeenCalled();
  });

  test('should call onError if request fails', async () => {
    createRule.mockRejectedValueOnce({});

    const { result } = renderHook(
      () => {
        return useCreateRule({
          http: httpMock as unknown as HttpStart,
          onSuccess: onSuccessMock,
          onError: onErrorMock,
        });
      },
      { wrapper }
    );

    result.current.mutate({ formData: ruleToCreate });

    await waitFor(() => {
      return expect(createRule).toHaveBeenCalledWith({ http: httpMock, rule: ruleToCreate });
    });

    expect(onErrorMock).toHaveBeenCalled();
  });
});
