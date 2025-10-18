/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { StepExecutionDataView } from './step_execution_data_view';

// Mock the JSONDataView component
const mockJSONDataView = jest.fn();
jest.mock('../../../shared/ui/json_data_view', () => ({
  JSONDataView: (props: any) => {
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
    render(<StepExecutionDataView stepExecution={baseStepExecution as any} mode="input" />);

    expect(mockJSONDataView).toHaveBeenCalledWith({
      data: { param1: 'value1', param2: 2 },
      title: 'Input',
      fieldPathActionsPrefix: undefined,
    });
  });

  it('renders output data correctly', () => {
    render(<StepExecutionDataView stepExecution={baseStepExecution as any} mode="output" />);

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
    render(<StepExecutionDataView stepExecution={errorStepExecution as any} mode="output" />);

    expect(mockJSONDataView).toHaveBeenCalledWith({
      data: { error: { message: 'Something went wrong', code: 'ERROR_CODE' } },
      title: 'Error',
      fieldPathActionsPrefix: undefined,
    });
  });

  it('wraps primitive data in an object', () => {
    const primitiveStepExecution = {
      ...baseStepExecution,
      input: 123,
    };
    render(<StepExecutionDataView stepExecution={primitiveStepExecution as any} mode="input" />);

    expect(mockJSONDataView).toHaveBeenCalledWith({
      data: { value: 123 },
      title: 'Input',
      fieldPathActionsPrefix: undefined,
    });
  });

  it('renders empty state gracefully with empty input', () => {
    const emptyStepExecution = {
      ...baseStepExecution,
      input: undefined,
    };
    render(<StepExecutionDataView stepExecution={emptyStepExecution as any} mode="input" />);

    expect(mockJSONDataView).toHaveBeenCalledWith({
      data: {},
      title: 'Input',
      fieldPathActionsPrefix: undefined,
    });
  });

  it('sets fieldPathActionsPrefix for array output data', () => {
    const arrayStepExecution = {
      ...baseStepExecution,
      output: [{ item: 'first' }, { item: 'second' }],
    };
    render(<StepExecutionDataView stepExecution={arrayStepExecution as any} mode="output" />);

    expect(mockJSONDataView).toHaveBeenCalledWith({
      data: { item: 'first' },
      title: 'Output',
      fieldPathActionsPrefix: 'steps.my-step.output[0]',
    });
  });
});
