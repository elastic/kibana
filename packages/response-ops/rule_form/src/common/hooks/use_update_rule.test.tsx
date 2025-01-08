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
import { waitFor, renderHook } from '@testing-library/react';
import type { HttpStart } from '@kbn/core-http-browser';

import { useUpdateRule } from './use_update_rule';
import { UpdateRuleBody } from '../apis/update_rule';
import { RuleTypeParams } from '../types';

const ruleToUpdate: UpdateRuleBody<RuleTypeParams> = {
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
  schedule: { interval: '1m' },
  tags: [],
  name: 'test',
  throttle: null,
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

jest.mock('../apis/update_rule/update_rule', () => ({
  updateRule: jest.fn(),
}));

const { updateRule } = jest.requireMock('../apis/update_rule/update_rule');

const httpMock = jest.fn();
const onSuccessMock = jest.fn();
const onErrorMock = jest.fn();

describe('useUpdateRule', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should call onSuccess if request succeeds', async () => {
    updateRule.mockResolvedValueOnce({});

    const { result } = renderHook(
      () => {
        return useUpdateRule({
          http: httpMock as unknown as HttpStart,
          onSuccess: onSuccessMock,
          onError: onErrorMock,
        });
      },
      { wrapper }
    );

    result.current.mutate({ id: 'test-rule', formData: ruleToUpdate });

    await waitFor(() => {
      return expect(updateRule).toHaveBeenCalledWith({
        http: httpMock,
        id: 'test-rule',
        rule: ruleToUpdate,
      });
    });

    expect(onSuccessMock).toHaveBeenCalled();
  });

  test('should call onError if request fails', async () => {
    updateRule.mockRejectedValueOnce({});

    const { result } = renderHook(
      () => {
        return useUpdateRule({
          http: httpMock as unknown as HttpStart,
          onSuccess: onSuccessMock,
          onError: onErrorMock,
        });
      },
      { wrapper }
    );

    result.current.mutate({ id: 'test-rule', formData: ruleToUpdate });

    await waitFor(() => {
      return expect(updateRule).toHaveBeenCalledWith({
        http: httpMock,
        id: 'test-rule',
        rule: ruleToUpdate,
      });
    });

    expect(onErrorMock).toHaveBeenCalled();
  });
});
