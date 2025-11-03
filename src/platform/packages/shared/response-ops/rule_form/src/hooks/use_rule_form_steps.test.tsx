/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRuleFormHorizontalSteps, useRuleFormSteps } from './use_rule_form_steps';
import {
  RULE_FORM_PAGE_RULE_DEFINITION_TITLE,
  RULE_FORM_PAGE_RULE_ACTIONS_TITLE,
  RULE_FORM_PAGE_RULE_DETAILS_TITLE,
  RULE_FORM_PAGE_RULE_DEFINITION_TITLE_SHORT,
  RULE_FORM_PAGE_RULE_DETAILS_TITLE_SHORT,
} from '../translations';
import type { RuleFormData } from '../types';
import { EuiSteps, EuiStepsHorizontal } from '@elastic/eui';

jest.mock('../rule_definition', () => ({
  RuleDefinition: () => <div />,
}));

jest.mock('../rule_actions', () => ({
  RuleActions: () => <div />,
}));

jest.mock('../rule_details', () => ({
  RuleDetails: () => <div />,
}));

jest.mock('./use_rule_form_state', () => ({
  useRuleFormState: jest.fn(),
}));

const { useRuleFormState } = jest.requireMock('./use_rule_form_state');

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

const ruleFormStateMock = {
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
};

describe('useRuleFormSteps', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', () => {
    useRuleFormState.mockReturnValue(ruleFormStateMock);

    const TestComponent = () => {
      const { steps } = useRuleFormSteps();

      return <EuiSteps steps={steps} />;
    };

    render(<TestComponent />);

    expect(screen.getByText(RULE_FORM_PAGE_RULE_DEFINITION_TITLE)).toBeInTheDocument();
    expect(screen.getByText(RULE_FORM_PAGE_RULE_ACTIONS_TITLE)).toBeInTheDocument();
    expect(screen.getByText(RULE_FORM_PAGE_RULE_DETAILS_TITLE)).toBeInTheDocument();
  });

  test('renders initial errors as incomplete, then danger when the corresponding step blurs', async () => {
    useRuleFormState.mockReturnValue({
      ...ruleFormStateMock,
      baseErrors: {
        interval: ['Interval is required'],
        alertDelay: ['Alert delay is required'],
      },
    });

    const TestComponent = () => {
      const { steps } = useRuleFormSteps();

      return <EuiSteps steps={steps} />;
    };

    render(<TestComponent />);

    // Use screen reader text for testing
    expect(await screen.getByText('Step 1 is incomplete')).toBeInTheDocument();
    const step1 = screen.getByTestId('ruleFormStep-rule-definition-reportOnBlur');
    await fireEvent.blur(step1!);
    expect(await screen.getByText('Step 1 has errors')).toBeInTheDocument();
  });
});

test('renders actions as incomplete if there are 0 defined actions', async () => {
  useRuleFormState.mockReturnValue({
    ...ruleFormStateMock,
    formData: {
      ...formDataMock,
      actions: [],
    },
  });

  const TestComponent = () => {
    const { steps } = useRuleFormSteps();

    return <EuiSteps steps={steps} />;
  };

  render(<TestComponent />);

  expect(await screen.getByText('Step 2 is incomplete')).toBeInTheDocument();
  const step2 = screen.getByTestId('ruleFormStep-rule-actions-reportOnBlur');
  await fireEvent.blur(step2!);
  expect(await screen.queryByText('Step 2 has errors')).not.toBeInTheDocument();
});

test('renders actions as complete if there are more than 0 defined actions', async () => {
  useRuleFormState.mockReturnValue({
    ...ruleFormStateMock,
    formData: {
      ...formDataMock,
      actions: [{ id: '1', actionTypeId: 'test', name: 'test' }],
    },
  });

  const TestComponent = () => {
    const { steps } = useRuleFormSteps();

    return <EuiSteps steps={steps} />;
  };

  render(<TestComponent />);
  expect(await screen.queryByText('Step 2 has errors')).not.toBeInTheDocument();
  expect(await screen.queryByText('Step 2 is incomplete')).not.toBeInTheDocument();
});

describe('useRuleFormHorizontalSteps', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', () => {
    useRuleFormState.mockReturnValue(ruleFormStateMock);

    const TestComponent = () => {
      const { steps } = useRuleFormHorizontalSteps();

      return <EuiStepsHorizontal steps={steps} />;
    };

    render(<TestComponent />);

    expect(screen.getByText(RULE_FORM_PAGE_RULE_DEFINITION_TITLE_SHORT)).toBeInTheDocument();
    expect(screen.getByText(RULE_FORM_PAGE_RULE_ACTIONS_TITLE)).toBeInTheDocument();
    expect(screen.getByText(RULE_FORM_PAGE_RULE_DETAILS_TITLE_SHORT)).toBeInTheDocument();
  });

  test('tracks current step successfully', async () => {
    useRuleFormState.mockReturnValue(ruleFormStateMock);

    const TestComponent = () => {
      const { steps, goToNextStep, goToPreviousStep } = useRuleFormHorizontalSteps();

      return (
        <>
          <EuiStepsHorizontal steps={steps} />
          <button onClick={goToNextStep}>Next</button>
          <button onClick={goToPreviousStep}>Previous</button>
        </>
      );
    };

    render(<TestComponent />);

    expect(await screen.getByText('Current step is 1')).toBeInTheDocument();

    const nextButton = screen.getByText('Next');
    const previousButton = screen.getByText('Previous');

    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    expect(await screen.getByText('Current step is 3')).toBeInTheDocument();

    fireEvent.click(nextButton);

    expect(await screen.getByText('Current step is 3')).toBeInTheDocument();

    fireEvent.click(previousButton);

    expect(await screen.getByText('Current step is 2')).toBeInTheDocument();

    fireEvent.click(previousButton);

    expect(await screen.getByText('Current step is 1')).toBeInTheDocument();

    fireEvent.click(previousButton);

    expect(await screen.getByText('Current step is 1')).toBeInTheDocument();
  });
});
