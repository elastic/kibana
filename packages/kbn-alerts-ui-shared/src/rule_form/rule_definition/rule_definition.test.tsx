/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';

import { RuleDefinition } from './rule_definition';
import { RuleType } from '@kbn/alerting-types';
import { RuleTypeModel } from '../../common/types';

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

const ruleType = {
  id: '.es-query',
  name: 'Test',
  actionGroups: [
    {
      id: 'testActionGroup',
      name: 'Test Action Group',
    },
    {
      id: 'recovered',
      name: 'Recovered',
    },
  ],
  defaultActionGroupId: 'testActionGroup',
  minimumLicenseRequired: 'basic',
  recoveryActionGroup: 'recovered',
  producer: 'logs',
  authorizedConsumers: {
    alerting: { read: true, all: true },
    test: { read: true, all: true },
    stackAlerts: { read: true, all: true },
    logs: { read: true, all: true },
  },
  actionVariables: {
    params: [],
    state: [],
  },
  enabledInLicense: true,
} as unknown as RuleType;

const ruleModel: RuleTypeModel = {
  id: '.es-query',
  description: 'Sample rule type model',
  iconClass: 'sampleIconClass',
  documentationUrl: 'testurl',
  validate: (params, isServerless) => ({ errors: {} }),
  ruleParamsExpression: () => <div>Expression</div>,
  defaultActionMessage: 'Sample default action message',
  defaultRecoveryMessage: 'Sample default recovery message',
  requiresAppContext: false,
};

const plugins = {
  charts: {} as ChartsPluginSetup,
  data: {} as DataPublicPluginStart,
  dataViews: {} as DataViewsPublicPluginStart,
  unifiedSearch: {} as UnifiedSearchPublicPluginStart,
  docLinks: {} as DocLinksStart,
};

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');

const mockOnChange = jest.fn();

describe('Rule Definition', () => {
  beforeEach(() => {
    useRuleFormDispatch.mockReturnValue(mockOnChange);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Renders correctly', () => {
    useRuleFormState.mockReturnValue({
      plugins,
      formData: {
        id: 'test-id',
        params: {},
        schedule: {
          interval: '1m',
        },
        alertDelay: {
          active: 5,
        },
        notifyWhen: null,
        consumer: 'stackAlerts',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
      canShowConsumerSelection: true,
      validConsumers: ['logs', 'stackAlerts'],
    });

    render(<RuleDefinition />);
    expect(screen.getByTestId('ruleDefinition')).toBeInTheDocument();
    expect(screen.getByTestId('ruleSchedule')).toBeInTheDocument();
    expect(screen.getByTestId('ruleConsumerSelection')).toBeInTheDocument();
    expect(screen.getByTestId('ruleDefinitionHeaderDocsLink')).toBeInTheDocument();
    expect(screen.getByTestId('alertDelay')).not.toBeVisible();

    expect(screen.getByText('Expression')).toBeInTheDocument();
  });

  test('Hides doc link if not provided', () => {
    useRuleFormState.mockReturnValue({
      plugins,
      formData: {
        id: 'test-id',
        params: {},
        schedule: {
          interval: '1m',
        },
        alertDelay: {
          active: 5,
        },
        notifyWhen: null,
        consumer: 'stackAlerts',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: {
        ...ruleModel,
        documentationUrl: null,
      },
    });
    render(<RuleDefinition />);

    expect(screen.queryByTestId('ruleDefinitionHeaderDocsLink')).not.toBeInTheDocument();
  });

  test('Hides consumer selection if canShowConsumerSelection is false', () => {
    useRuleFormState.mockReturnValue({
      plugins,
      formData: {
        id: 'test-id',
        params: {},
        schedule: {
          interval: '1m',
        },
        alertDelay: {
          active: 5,
        },
        notifyWhen: null,
        consumer: 'stackAlerts',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
    });

    render(<RuleDefinition />);

    expect(screen.queryByTestId('ruleConsumerSelection')).not.toBeInTheDocument();
  });

  test('Can toggle advanced options', async () => {
    useRuleFormState.mockReturnValue({
      plugins,
      formData: {
        id: 'test-id',
        params: {},
        schedule: {
          interval: '1m',
        },
        alertDelay: {
          active: 5,
        },
        notifyWhen: null,
        consumer: 'stackAlerts',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
    });

    render(<RuleDefinition />);

    fireEvent.click(screen.getByTestId('advancedOptionsAccordionButton'));
    expect(screen.getByTestId('alertDelay')).toBeVisible();
  });

  test('Calls onChange when inputs are modified', () => {
    useRuleFormState.mockReturnValue({
      plugins,
      formData: {
        id: 'test-id',
        params: {},
        schedule: {
          interval: '1m',
        },
        alertDelay: {
          active: 5,
        },
        notifyWhen: null,
        consumer: 'stackAlerts',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
    });

    render(<RuleDefinition />);

    fireEvent.change(screen.getByTestId('ruleScheduleNumberInput'), {
      target: {
        value: '10',
      },
    });
    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'setSchedule',
      payload: {
        interval: '10m',
      },
    });
  });
});
