/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { RuleTypeModel } from '@kbn/alerts-ui-shared';
import { RuleTypeModalComponent } from '.';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@kbn/response-ops-rules-apis/hooks/use_get_rule_types_query', () => ({
  useGetRuleTypesQuery: jest.fn().mockImplementation(() => ({
    data: [
      {
        id: 'ruleType1',
        name: 'ruleType1',
        description: 'The first test rule type',
        enabledInLicense: true,
        actionVariables: { context: [], state: [], params: [] },
        authorizedConsumers: {},
        defaultActionGroupId: 'default',
        actionGroups: [],
        producer: 'alerts',
        minimumLicenseRequired: 'basic',
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        isExportable: true,
        ruleTaskTimeout: '5m',
        category: 'test-category',
      },
      {
        id: 'ruleType2',
        name: 'ruleType2',
        description: 'The second test rule type',
        enabledInLicense: true,
        actionVariables: { context: [], state: [], params: [] },
        authorizedConsumers: {},
        defaultActionGroupId: 'default',
        actionGroups: [],
        producer: 'alerts',
        minimumLicenseRequired: 'basic',
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        isExportable: true,
        ruleTaskTimeout: '5m',
        category: 'test-category',
      },
      {
        id: 'ruleType3',
        name: 'ruleType3',
        description: 'The third test rule type',
        enabledInLicense: true,
        actionVariables: { context: [], state: [], params: [] },
        authorizedConsumers: {},
        defaultActionGroupId: 'default',
        actionGroups: [],
        producer: 'alerts',
        minimumLicenseRequired: 'basic',
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        isExportable: true,
        ruleTaskTimeout: '5m',
        category: 'test-category',
      },
      {
        id: 'ruleType4',
        name: 'ruleType4',
        description: 'The fourth test rule type',
        enabledInLicense: true,
        actionVariables: { context: [], state: [], params: [] },
        authorizedConsumers: {},
        defaultActionGroupId: 'default',
        actionGroups: [],
        producer: 'alerts',
        minimumLicenseRequired: 'basic',
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        isExportable: true,
        ruleTaskTimeout: '5m',
        category: 'test-category',
      },
      {
        id: 'ruleType5',
        name: 'ruleType5',
        description: 'The fifth test rule type',
        enabledInLicense: true,
        actionVariables: { context: [], state: [], params: [] },
        authorizedConsumers: {},
        defaultActionGroupId: 'default',
        actionGroups: [],
        producer: 'alerts',
        minimumLicenseRequired: 'basic',
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        isExportable: true,
        ruleTaskTimeout: '5m',
        category: 'test-category',
      },
    ],
    isLoading: false,
    isSuccess: true,
    isFetching: false,
    isInitialLoading: false,
    error: null,
  })),
}));

function render(ui: React.ReactElement) {
  return rtlRender(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
    ),
  });
}

describe('RuleTypeModalComponent', () => {
  const mockOnClose = jest.fn();
  const mockOnSelect = jest.fn();
  const mockHttp = jest.fn() as unknown as jest.Mocked<HttpStart>;
  const mockToasts = jest.fn() as unknown as jest.Mocked<ToastsStart>;

  const ruleTypes: RuleTypeModel[] = [
    {
      id: 'ruleType1',
      description: 'The first test rule type',
      iconClass: 'beaker',
      documentationUrl: 'https://example.com/docs/ruleType1',
      validate: () => ({ isValid: true, errors: [] }),
      ruleParamsExpression: () => <div>Rule Type 1 Params</div>,
      requiresAppContext: false,
    },
    {
      id: 'ruleType2',
      description: 'The second test rule type',
      iconClass: 'alert',
      documentationUrl: 'https://example.com/docs/ruleType2',
      validate: () => ({ isValid: true, errors: [] }),
      ruleParamsExpression: () => <div>Rule Type 2 Params</div>,
      requiresAppContext: true,
    },
    {
      id: 'ruleType3',
      description: 'The third test rule type',
      iconClass: 'gear',
      documentationUrl: 'https://example.com/docs/ruleType3',
      validate: () => ({ isValid: true, errors: [] }),
      ruleParamsExpression: () => <div>Rule Type 3 Params</div>,
      requiresAppContext: false,
    },
    {
      id: 'ruleType4',
      description: 'The fourth test rule type',
      iconClass: 'clock',
      documentationUrl: 'https://example.com/docs/ruleType4',
      validate: () => ({ isValid: true, errors: [] }),
      ruleParamsExpression: () => <div>Rule Type 4 Params</div>,
      requiresAppContext: true,
    },
    {
      id: 'ruleType5',
      description: 'The fifth test rule type',
      iconClass: 'check',
      documentationUrl: 'https://example.com/docs/ruleType5',
      validate: () => ({ isValid: true, errors: [] }),
      ruleParamsExpression: () => <div>Rule Type 5 Params</div>,
      requiresAppContext: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('modal should only contain registered rule types that do not require app context', () => {
    render(
      <RuleTypeModalComponent
        onClose={mockOnClose}
        onSelectRuleType={mockOnSelect}
        filteredRuleTypes={[]}
        registeredRuleTypes={ruleTypes}
        http={mockHttp}
        toasts={mockToasts}
      />
    );

    expect(screen.getByText('Select rule type')).toBeInTheDocument();
    // all rules that do not require app context should be present
    ruleTypes.forEach((ruleType) => {
      if (ruleType.requiresAppContext) {
        expect(screen.queryByText(ruleType.description)).not.toBeInTheDocument();
      } else {
        expect(screen.getByText(ruleType.description)).toBeInTheDocument();
      }
    });
  });

  it('should call onClose when the close button is clicked', () => {
    render(
      <RuleTypeModalComponent
        onClose={mockOnClose}
        onSelectRuleType={mockOnSelect}
        filteredRuleTypes={[]}
        registeredRuleTypes={ruleTypes}
        http={mockHttp}
        toasts={mockToasts}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not render the modal when isOpen is false', () => {
    render(
      <RuleTypeModalComponent
        onClose={mockOnClose}
        onSelectRuleType={mockOnSelect}
        filteredRuleTypes={[]}
        http={mockHttp}
        registeredRuleTypes={ruleTypes}
        toasts={mockToasts}
      />
    );

    expect(screen.queryByText('Select a Rule Type')).not.toBeInTheDocument();
  });
});
