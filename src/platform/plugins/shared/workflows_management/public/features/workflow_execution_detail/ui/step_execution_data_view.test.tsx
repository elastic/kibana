/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { StepExecutionDataView } from './step_execution_data_view';

// Helper function to render with I18n provider
const renderWithIntl = (component: React.ReactElement) => {
  return render(component, { wrapper: I18nProvider });
};

// Mock the JSONDataView component
const mockJSONDataView = jest.fn();
jest.mock('../../../shared/ui/execution_data_viewer', () => ({
  ExecutionDataViewer: (props: any) => {
    mockJSONDataView(props);
    return <div data-test-subj="mocked-json-data-view">{props.title}</div>;
  },
}));

const baseStepExecution = {
  stepId: 'my-step',
  input: { param1: 'value1', param2: 2 },
  output: { result: 'ok', details: { field: 'abc' } },
  status: 'completed',
  startedAt: new Date().toISOString(),
  id: 'step-execution-1',
};

describe('StepExecutionDataView', () => {
  beforeEach(() => {
    mockJSONDataView.mockClear();
  });

  it('renders input data correctly', () => {
    renderWithIntl(<StepExecutionDataView stepExecution={baseStepExecution as any} mode="input" />);

    expect(mockJSONDataView).toHaveBeenCalledWith({
      data: { param1: 'value1', param2: 2 },
      title: 'Input',
      fieldPathActionsPrefix: undefined,
    });
  });

  it('renders output data correctly', () => {
    renderWithIntl(
      <StepExecutionDataView stepExecution={baseStepExecution as any} mode="output" />
    );

    expect(mockJSONDataView).toHaveBeenCalledWith({
      data: { result: 'ok', details: { field: 'abc' } },
      title: 'Output',
      fieldPathActionsPrefix: 'steps.my-step.output',
    });
  });

  it('renders error data with error title', () => {
    const errorStepExecution = {
      ...baseStepExecution,
      error: {
        message: 'Something went wrong',
        code: 'ERROR_CODE',
      },
    };
    renderWithIntl(
      <StepExecutionDataView stepExecution={errorStepExecution as any} mode="output" />
    );

    expect(mockJSONDataView).toHaveBeenCalledWith({
      data: { error: { message: 'Something went wrong', code: 'ERROR_CODE' } },
      title: 'Error',
      fieldPathActionsPrefix: undefined,
    });
  });

  it('passes primitive data as-is', () => {
    const primitiveStepExecution = {
      ...baseStepExecution,
      input: 123,
    };
    renderWithIntl(
      <StepExecutionDataView stepExecution={primitiveStepExecution as any} mode="input" />
    );

    expect(mockJSONDataView).toHaveBeenCalledWith({
      data: 123,
      title: 'Input',
      fieldPathActionsPrefix: undefined,
    });
  });

  it('renders empty state message when input is undefined', () => {
    const emptyStepExecution = {
      ...baseStepExecution,
      input: undefined,
    };
    const { getByText } = renderWithIntl(
      <StepExecutionDataView stepExecution={emptyStepExecution as any} mode="input" />
    );

    expect(mockJSONDataView).not.toHaveBeenCalled();
    expect(getByText(/no input data/i)).toBeInTheDocument();
  });

  it('passes array output data as-is without flattening', () => {
    const arrayStepExecution = {
      ...baseStepExecution,
      output: [{ item: 'first' }, { item: 'second' }],
    };
    renderWithIntl(
      <StepExecutionDataView stepExecution={arrayStepExecution as any} mode="output" />
    );

    expect(mockJSONDataView).toHaveBeenCalledWith({
      data: [{ item: 'first' }, { item: 'second' }],
      title: 'Output',
      fieldPathActionsPrefix: 'steps.my-step.output',
    });
  });
});
