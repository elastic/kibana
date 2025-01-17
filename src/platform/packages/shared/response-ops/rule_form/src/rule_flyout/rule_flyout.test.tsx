/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RuleFlyout } from './rule_flyout';
import {
  RULE_FORM_PAGE_RULE_DEFINITION_TITLE_SHORT,
  RULE_FORM_PAGE_RULE_ACTIONS_TITLE,
  RULE_FORM_PAGE_RULE_DETAILS_TITLE_SHORT,
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

jest.mock('../hooks/use_rule_form_state', () => ({
  useRuleFormState: jest.fn(),
}));

jest.mock('../hooks/use_rule_form_dispatch', () => ({
  useRuleFormDispatch: jest.fn(),
}));

const { useRuleFormState } = jest.requireMock('../hooks/use_rule_form_state');

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

describe('ruleFlyout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', () => {
    render(<RuleFlyout onCancel={onCancel} onSave={onSave} />);

    expect(screen.getByText(RULE_FORM_PAGE_RULE_DEFINITION_TITLE_SHORT)).toBeInTheDocument();
    expect(screen.getByText(RULE_FORM_PAGE_RULE_ACTIONS_TITLE)).toBeInTheDocument();
    expect(screen.getByText(RULE_FORM_PAGE_RULE_DETAILS_TITLE_SHORT)).toBeInTheDocument();

    expect(screen.getByTestId('ruleFlyoutFooterCancelButton')).toBeInTheDocument();
    expect(screen.getByTestId('ruleFlyoutFooterNextStepButton')).toBeInTheDocument();
  });

  test('should navigate back and forth through steps correctly', async () => {
    render(<RuleFlyout onCancel={onCancel} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('ruleFlyoutFooterNextStepButton'));
    await waitFor(() =>
      expect(screen.getByTestId('ruleFlyoutFooterPreviousStepButton')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('ruleFlyoutFooterNextStepButton'));
    await waitFor(() =>
      expect(screen.getByTestId('ruleFlyoutFooterSaveButton')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('ruleFlyoutFooterPreviousStepButton'));
    await waitFor(() =>
      expect(screen.getByTestId('ruleFlyoutFooterNextStepButton')).toBeInTheDocument()
    );
  });

  test('should call onSave when save button is pressed', async () => {
    render(<RuleFlyout onCancel={onCancel} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('ruleFlyoutFooterNextStepButton'));
    await waitFor(() =>
      expect(screen.getByTestId('ruleFlyoutFooterPreviousStepButton')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('ruleFlyoutFooterNextStepButton'));
    await waitFor(() =>
      expect(screen.getByTestId('ruleFlyoutFooterSaveButton')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('ruleFlyoutFooterSaveButton'));

    expect(onSave).toHaveBeenCalledWith({
      ...formDataMock,
      consumer: 'logs',
    });
  });

  test('should call onCancel when the cancel button is clicked', () => {
    render(<RuleFlyout onCancel={onCancel} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('ruleFlyoutFooterCancelButton'));
    expect(onCancel).toHaveBeenCalled();
  });
});
