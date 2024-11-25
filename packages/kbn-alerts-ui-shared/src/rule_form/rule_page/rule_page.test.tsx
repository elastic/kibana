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

const onCancel = jest.fn();

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

describe('rulePage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', () => {
    render(<RulePage onCancel={onCancel} onSave={onSave} />);

    expect(screen.getByText(RULE_FORM_PAGE_RULE_DEFINITION_TITLE)).toBeInTheDocument();
    expect(screen.getByText(RULE_FORM_PAGE_RULE_ACTIONS_TITLE)).toBeInTheDocument();
    expect(screen.getByText(RULE_FORM_PAGE_RULE_DETAILS_TITLE)).toBeInTheDocument();
  });

  test('should call onSave when save button is pressed', () => {
    render(<RulePage onCancel={onCancel} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('rulePageFooterSaveButton'));
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(onSave).toHaveBeenCalledWith({
      ...formDataMock,
      consumer: 'logs',
    });
  });

  test('should call onCancel when the cancel button is clicked', () => {
    render(<RulePage onCancel={onCancel} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('rulePageFooterCancelButton'));
    expect(onCancel).toHaveBeenCalled();
  });

  test('should call onCancel when the return button is clicked', () => {
    render(<RulePage onCancel={onCancel} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('rulePageReturnButton'));
    expect(onCancel).toHaveBeenCalled();
  });

  test('should display discard changes modal only if changes are made in the form', () => {
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
      touched: true,
      formData: formDataMock,
      connectors: [],
      connectorTypes: [],
      aadTemplateFields: [],
    });

    render(<RulePage onCancel={onCancel} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('rulePageFooterCancelButton'));
    expect(screen.getByTestId('ruleFormCancelModal')).toBeInTheDocument();
  });

  test('should not display discard changes modal id no changes are made in the form', () => {
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
      touched: false,
      formData: formDataMock,
      connectors: [],
      connectorTypes: [],
      aadTemplateFields: [],
    });

    render(<RulePage onCancel={onCancel} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('rulePageFooterCancelButton'));
    expect(screen.queryByTestId('ruleFormCancelModal')).not.toBeInTheDocument();
  });
});
