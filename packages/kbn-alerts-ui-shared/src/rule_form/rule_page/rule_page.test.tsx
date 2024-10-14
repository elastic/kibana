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
import { RulePage } from './rule_page';
import {
  RULE_FORM_PAGE_RULE_DEFINITION_TITLE,
  RULE_FORM_PAGE_RULE_ACTIONS_TITLE,
  RULE_FORM_PAGE_RULE_DETAILS_TITLE,
} from '../translations';
import { RuleFormData } from '../types';

jest.mock('../rule_definition', () => ({
  RuleDefinition: () => <div />,
}));

jest.mock('../rule_actions', () => ({
  RuleActions: () => <div />,
}));

jest.mock('../rule_details', () => ({
  RuleDetails: () => <div />,
}));

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

const { useRuleFormState } = jest.requireMock('../hooks');

const navigateToUrl = jest.fn();

const formDataMock: RuleFormData = {
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
  actions: [],
  consumer: 'stackAlerts',
  schedule: { interval: '1m' },
  tags: [],
  name: 'test',
  notifyWhen: 'onActionGroupChange',
  alertDelay: {
    active: 10,
  },
};

useRuleFormState.mockReturnValue({
  plugins: {
    application: {
      navigateToUrl,
      capabilities: {
        actions: {
          show: true,
          save: true,
          execute: true,
        },
      },
    },
  },
  baseErrors: {},
  paramsErrors: {},
  multiConsumerSelection: 'logs',
  formData: formDataMock,
  connectors: [],
  connectorTypes: [],
  aadTemplateFields: [],
});

const onSave = jest.fn();
const returnUrl = 'management';

describe('rulePage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', () => {
    render(<RulePage returnUrl={returnUrl} onSave={onSave} />);

    expect(screen.getByText(RULE_FORM_PAGE_RULE_DEFINITION_TITLE)).toBeInTheDocument();
    expect(screen.getByText(RULE_FORM_PAGE_RULE_ACTIONS_TITLE)).toBeInTheDocument();
    expect(screen.getByText(RULE_FORM_PAGE_RULE_DETAILS_TITLE)).toBeInTheDocument();
  });

  test('should call onSave when save button is pressed', () => {
    render(<RulePage returnUrl={returnUrl} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('rulePageFooterSaveButton'));
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(onSave).toHaveBeenCalledWith({
      ...formDataMock,
      consumer: 'logs',
    });
  });

  test('should call onCancel when the cancel button is clicked', () => {
    render(<RulePage returnUrl={returnUrl} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('rulePageFooterCancelButton'));
    expect(navigateToUrl).toHaveBeenCalledWith('management');
  });

  test('should call onCancel when the return button is clicked', () => {
    render(<RulePage returnUrl={returnUrl} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('rulePageReturnButton'));
    expect(navigateToUrl).toHaveBeenCalledWith('management');
  });
});
