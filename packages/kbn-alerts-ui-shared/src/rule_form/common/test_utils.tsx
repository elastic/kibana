/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor, screen } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { HttpStart } from '@kbn/core-http-browser';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { AlertConsumers, ES_QUERY_ID, RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { ContextsProvider } from '../contexts';
import {
  RuleFormAppContext,
  RuleTypeParams,
  RuleTypeModel,
  RuleTypeModelFromRegistry,
  RuleTypeParamsExpressionProps,
  RuleFormRule,
} from '../types';
import {
  BASE_ALERTING_API_PATH,
  INTERNAL_BASE_ALERTING_API_PATH,
  DEFAULT_VALID_CONSUMERS,
} from './constants';
import { IncompleteError, InvalidError } from './validation_error';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  registeredRuleTypeModel?: RuleTypeModelFromRegistry;
  isEdit?: boolean;
  ruleId?: string;
  authorizedConsumers?: RuleCreationValidConsumer[];
  appContext?: RuleFormAppContext;
}

interface MockRuleTypeParams extends RuleTypeParams {
  owo: string;
  uwu: number;
}
export const mockRuleType: RuleTypeModel<MockRuleTypeParams> = {
  id: 'test',
  name: 'Test rule type',
  description: 'A mocked test rule type',
  iconClass: 'test',
  documentationUrl: 'https://test.com',
  validate: (params) => ({
    errors: {
      owo: params.owo.length > 0 ? [] : [IncompleteError('owo is required')],
      uwu: params.uwu > 0 ? [] : [InvalidError('uwu must be greater than 0')],
    },
  }),
  ruleParamsExpression: ({ setRuleParams }: RuleTypeParamsExpressionProps) => (
    <>
      <button data-test-subj="clearOwo" onClick={() => setRuleParams('owo', '')}>
        Set owo to empty
      </button>
      <button data-test-subj="zeroUwu" onClick={() => setRuleParams('uwu', 0)}>
        Set uwu to 0
      </button>
    </>
  ),
  defaultRuleParams: {
    owo: 'hewwo',
    uwu: 621,
  },
  authorizedConsumers: {
    [AlertConsumers.LOGS]: { read: true, all: true },
    [AlertConsumers.STACK_ALERTS]: { read: true, all: true },
    [AlertConsumers.APM]: { read: false, all: false },
    [AlertConsumers.SIEM]: { read: false, all: false },
    [AlertConsumers.INFRASTRUCTURE]: { read: false, all: false },
    [AlertConsumers.UPTIME]: { read: false, all: false },
    [AlertConsumers.ML]: { read: false, all: false },
    [AlertConsumers.OBSERVABILITY]: { read: false, all: false },
    [AlertConsumers.MONITORING]: { read: false, all: false },
    [AlertConsumers.SLO]: { read: false, all: false },
    [AlertConsumers.EXAMPLE]: { read: false, all: false },
  },
};

export const mockExistingRule: RuleFormRule = {
  id: 'test-existing-rule-id',
  name: 'Existing rule',
  tags: ['test'],
  consumer: 'alerts',
  schedule: { interval: '10h' },
  params: {
    owo: 'hiiii',
    uwu: 123,
  },
  ruleTypeId: 'test',
  actions: [],
};

const mockHttp = {
  get: jest.fn((url) => {
    if (url === `${BASE_ALERTING_API_PATH}/rule_types`) {
      return Promise.resolve([
        {
          id: mockRuleType.id,
          name: mockRuleType.name,
          authorized_consumers: mockRuleType.authorizedConsumers,
        },
        {
          id: ES_QUERY_ID,
          name: 'ES Query type mock',
          authorized_consumers: mockRuleType.authorizedConsumers,
        },
      ]);
    }
    if (
      url ===
      `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(
        'test-existing-rule-id'
      )}/_resolve`
    ) {
      return Promise.resolve(mockExistingRule);
    }
  }),
} as unknown as HttpStart;

const mockToasts = {
  addSuccess: jest.fn(),
  addDanger: jest.fn(),
  addWarning: jest.fn(),
  addError: jest.fn(),
} as unknown as ToastsStart;

export function renderWithProviders(
  ui: React.ReactElement,
  extendedRenderOptions: ExtendedRenderOptions = {}
) {
  const {
    registeredRuleTypeModel = omit(
      mockRuleType,
      'name',
      'authorizedConsumers'
    ) as RuleTypeModelFromRegistry,
    isEdit = false,
    ruleId = '',
    authorizedConsumers = DEFAULT_VALID_CONSUMERS,
    appContext = {},
    ...renderOptions
  } = extendedRenderOptions;

  const queryClient = new QueryClient();

  const Wrapper: React.FC = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <ContextsProvider
        registeredRuleTypeModel={registeredRuleTypeModel}
        isEdit={isEdit}
        ruleId={ruleId}
        http={mockHttp}
        toasts={mockToasts}
        isRuleTypeModelPending={false}
        appContext={appContext}
        onLoadRuleSuccess={jest.fn()}
      >
        {children}
      </ContextsProvider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export async function waitForFormToLoad() {
  return waitFor(async () => {
    expect(screen.queryByTestId('ruleFormLoadingPrompt')).not.toBeInTheDocument();
  });
}
