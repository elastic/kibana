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
import type { ToastsStart } from '@kbn/core-notifications-browser';

import { useLoadDependencies } from './use_load_dependencies';
import { RuleTypeRegistryContract } from '../../common';
import { ApplicationStart } from '@kbn/core-application-browser';

jest.mock('../../common/hooks/use_load_ui_config', () => ({
  useLoadUiConfig: jest.fn(),
}));

jest.mock('../../common/hooks/use_health_check', () => ({
  useHealthCheck: jest.fn(),
}));

jest.mock('../../common/hooks/use_resolve_rule', () => ({
  useResolveRule: jest.fn(),
}));

jest.mock('../../common/hooks/use_load_rule_types_query', () => ({
  useLoadRuleTypesQuery: jest.fn(),
}));

jest.mock('../../common/hooks/use_load_connectors', () => ({
  useLoadConnectors: jest.fn(),
}));

jest.mock('../../common/hooks/use_load_connector_types', () => ({
  useLoadConnectorTypes: jest.fn(),
}));

jest.mock('../../common/hooks/use_load_rule_type_aad_template_fields', () => ({
  useLoadRuleTypeAadTemplateField: jest.fn(),
}));

jest.mock('../utils/get_authorized_rule_types', () => ({
  getAvailableRuleTypes: jest.fn(),
}));

const { useLoadUiConfig } = jest.requireMock('../../common/hooks/use_load_ui_config');
const { useHealthCheck } = jest.requireMock('../../common/hooks/use_health_check');
const { useResolveRule } = jest.requireMock('../../common/hooks/use_resolve_rule');
const { useLoadConnectors } = jest.requireMock('../../common/hooks/use_load_connectors');
const { useLoadConnectorTypes } = jest.requireMock('../../common/hooks/use_load_connector_types');
const { useLoadRuleTypeAadTemplateField } = jest.requireMock(
  '../../common/hooks/use_load_rule_type_aad_template_fields'
);
const { useLoadRuleTypesQuery } = jest.requireMock('../../common/hooks/use_load_rule_types_query');
const { getAvailableRuleTypes } = jest.requireMock('../utils/get_authorized_rule_types');

const uiConfigMock = {
  isUsingSecurity: true,
  minimumScheduleInterval: {
    value: '1m',
    enforce: true,
  },
};

const ruleMock = {
  params: {},
  consumer: 'stackAlerts',
  schedule: { interval: '1m' },
  tags: [],
  name: 'test',
  enabled: true,
  throttle: null,
  ruleTypeId: '.index-threshold',
  actions: [],
  notifyWhen: 'onActionGroupChange',
  alertDelay: {
    active: 10,
  },
};

useLoadUiConfig.mockReturnValue({
  isLoading: false,
  isInitialLoading: false,
  data: uiConfigMock,
});

useHealthCheck.mockReturnValue({
  isLoading: false,
  isInitialLoading: false,
  error: null,
});

useResolveRule.mockReturnValue({
  isLoading: false,
  isInitialLoading: false,
  data: ruleMock,
});

const indexThresholdRuleType = {
  enabledInLicense: true,
  recoveryActionGroup: {
    id: 'recovered',
    name: 'Recovered',
  },
  actionGroups: [],
  defaultActionGroupId: 'threshold met',
  minimumLicenseRequired: 'basic',
  authorizedConsumers: {
    stackAlerts: {
      read: true,
      all: true,
    },
  },
  ruleTaskTimeout: '5m',
  doesSetRecoveryContext: true,
  hasAlertsMappings: true,
  hasFieldsForAAD: false,
  id: '.index-threshold',
  name: 'Index threshold',
  category: 'management',
  producer: 'stackAlerts',
  alerts: {},
  is_exportable: true,
};

const indexThresholdRuleTypeModel = {
  id: '.index-threshold',
  description: 'Alert when an aggregated query meets the threshold.',
  iconClass: 'alert',
  ruleParamsExpression: () => <div />,
  defaultActionMessage:
    'Rule {{rule.name}} is active for group {{context.group}}:\n\n- Value: {{context.value}}\n- Conditions Met: {{context.conditions}} over {{rule.params.timeWindowSize}}{{rule.params.timeWindowUnit}}\n- Timestamp: {{context.date}}',
  requiresAppContext: false,
};

const ruleTypeIndex = new Map();

ruleTypeIndex.set('.index-threshold', indexThresholdRuleType);

useLoadRuleTypesQuery.mockReturnValue({
  ruleTypesState: {
    isLoading: false,
    isInitialLoading: false,
    data: ruleTypeIndex,
  },
});

getAvailableRuleTypes.mockReturnValue([
  {
    ruleType: indexThresholdRuleType,
    ruleTypeModel: indexThresholdRuleTypeModel,
  },
]);

const mockConnector = {
  id: 'test-connector',
  name: 'Test',
  connector_type_id: 'test',
  is_preconfigured: false,
  is_deprecated: false,
  is_missing_secrets: false,
  is_system_action: false,
  referenced_by_count: 0,
  secrets: {},
  config: {},
};

const mockConnectorType = {
  id: 'test',
  name: 'Test',
  enabled: true,
  enabled_in_config: true,
  enabled_in_license: true,
  supported_feature_ids: ['alerting'],
  minimum_license_required: 'basic',
  is_system_action_type: false,
};

const mockAadTemplateField = {
  name: '@timestamp',
  deprecated: false,
  useWithTripleBracesInTemplates: false,
  usesPublicBaseUrl: false,
};

useLoadConnectors.mockReturnValue({
  data: [mockConnector],
  isLoading: false,
  isInitialLoading: false,
});

useLoadConnectorTypes.mockReturnValue({
  data: [mockConnectorType],
  isLoading: false,
  isInitialLoading: false,
});

useLoadRuleTypeAadTemplateField.mockReturnValue({
  data: [mockAadTemplateField],
  isLoading: false,
  isInitialLoading: false,
});

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const httpMock = jest.fn();
const toastsMock = jest.fn();

const ruleTypeRegistryMock: RuleTypeRegistryContract = {
  has: jest.fn(),
  register: jest.fn(),
  get: jest.fn(),
  list: jest.fn(),
};

describe('useLoadDependencies', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('loads all rule form dependencies', async () => {
    const { result } = renderHook(
      () => {
        return useLoadDependencies({
          http: httpMock as unknown as HttpStart,
          toasts: toastsMock as unknown as ToastsStart,
          ruleTypeRegistry: ruleTypeRegistryMock,
          capabilities: {
            actions: {
              show: true,
            },
          } as unknown as ApplicationStart['capabilities'],
        });
      },
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isLoading).toEqual(false);
    });

    expect(result.current).toEqual({
      isLoading: false,
      isInitialLoading: false,
      ruleType: indexThresholdRuleType,
      ruleTypeModel: indexThresholdRuleTypeModel,
      uiConfig: uiConfigMock,
      healthCheckError: null,
      fetchedFormData: ruleMock,
      connectors: [mockConnector],
      connectorTypes: [mockConnectorType],
      aadTemplateFields: [mockAadTemplateField],
    });
  });

  test('should call useLoadRuleTypesQuery with fitlered rule types', async () => {
    const { result } = renderHook(
      () => {
        return useLoadDependencies({
          http: httpMock as unknown as HttpStart,
          toasts: toastsMock as unknown as ToastsStart,
          ruleTypeRegistry: ruleTypeRegistryMock,
          filteredRuleTypes: ['test-rule-type'],
          capabilities: {
            actions: {
              show: true,
            },
          } as unknown as ApplicationStart['capabilities'],
        });
      },
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(useLoadRuleTypesQuery).toBeCalledWith({
      http: httpMock,
      toasts: toastsMock,
      filteredRuleTypes: ['test-rule-type'],
    });
  });

  test('should call getAvailableRuleTypes with the correct params', async () => {
    const { result } = renderHook(
      () => {
        return useLoadDependencies({
          http: httpMock as unknown as HttpStart,
          toasts: toastsMock as unknown as ToastsStart,
          ruleTypeRegistry: ruleTypeRegistryMock,
          validConsumers: ['stackAlerts', 'logs'],
          consumer: 'logs',
          capabilities: {
            actions: {
              show: true,
            },
          } as unknown as ApplicationStart['capabilities'],
        });
      },
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(getAvailableRuleTypes).toBeCalledWith({
      consumer: 'logs',
      ruleTypeRegistry: ruleTypeRegistryMock,
      ruleTypes: [indexThresholdRuleType],
      validConsumers: ['stackAlerts', 'logs'],
    });
  });

  test('should call resolve rule with the correct params', async () => {
    const { result } = renderHook(
      () => {
        return useLoadDependencies({
          http: httpMock as unknown as HttpStart,
          toasts: toastsMock as unknown as ToastsStart,
          ruleTypeRegistry: ruleTypeRegistryMock,
          id: 'test-rule-id',
          capabilities: {
            actions: {
              show: true,
            },
          } as unknown as ApplicationStart['capabilities'],
        });
      },
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(useResolveRule).toBeCalledWith({
      http: httpMock,
      id: 'test-rule-id',
    });
  });

  test('should use the ruleTypeId passed in if creating a rule', async () => {
    useResolveRule.mockReturnValue({
      isLoading: false,
      isInitialLoading: false,
      data: null,
    });

    const { result } = renderHook(
      () => {
        return useLoadDependencies({
          http: httpMock as unknown as HttpStart,
          toasts: toastsMock as unknown as ToastsStart,
          ruleTypeRegistry: ruleTypeRegistryMock,
          ruleTypeId: '.index-threshold',
          consumer: 'stackAlerts',
          capabilities: {
            actions: {
              show: true,
            },
          } as unknown as ApplicationStart['capabilities'],
        });
      },
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(result.current.ruleType).toEqual(indexThresholdRuleType);
  });

  test('should not use ruleTypeId if it is editing a rule', async () => {
    useResolveRule.mockReturnValue({
      isLoading: false,
      isInitialLoading: false,
      data: null,
    });

    const { result } = renderHook(
      () => {
        return useLoadDependencies({
          http: httpMock as unknown as HttpStart,
          toasts: toastsMock as unknown as ToastsStart,
          ruleTypeRegistry: ruleTypeRegistryMock,
          id: 'rule-id',
          consumer: 'stackAlerts',
          capabilities: {
            actions: {
              show: true,
            },
          } as unknown as ApplicationStart['capabilities'],
        });
      },
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(result.current.ruleType).toBeFalsy();
  });
});
