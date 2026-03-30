/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { StepExecuteManualForm } from './step_execute_manual_form';

jest.mock('@kbn/code-editor', () => {
  return {
    CodeEditor: ({
      value,
      onChange,
      dataTestSubj,
    }: {
      value: string;
      onChange: (v: string) => void;
      dataTestSubj: string;
    }) => (
      <textarea
        data-test-subj={dataTestSubj}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ),
  };
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(component, { wrapper: I18nProvider });
};

describe('StepExecuteManualForm', () => {
  const mockOnChange = jest.fn();

  const defaultProps = {
    value: '{"foo":"bar"}',
    setValue: mockOnChange,
    errors: null as string | null,
    warnings: null as string | null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the Input Data label', () => {
    renderWithProviders(<StepExecuteManualForm {...defaultProps} />);
    expect(screen.getByText('Input Data')).toBeInTheDocument();
  });

  it('should render the code editor with the current value', () => {
    renderWithProviders(<StepExecuteManualForm {...defaultProps} />);
    const editor = screen.getByTestId('workflow-event-manual-json-editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveValue('{"foo":"bar"}');
  });

  it('should call onChange when the editor value changes', () => {
    renderWithProviders(<StepExecuteManualForm {...defaultProps} />);
    const editor = screen.getByTestId('workflow-event-manual-json-editor');
    fireEvent.change(editor, { target: { value: '{"foo":"baz"}' } });
    expect(mockOnChange).toHaveBeenCalledWith('{"foo":"baz"}');
  });

  it('should render with empty value', () => {
    renderWithProviders(<StepExecuteManualForm {...defaultProps} value="" />);
    const editor = screen.getByTestId('workflow-event-manual-json-editor');
    expect(editor).toHaveValue('');
  });

  it('should show error callout when errors is provided', () => {
    renderWithProviders(<StepExecuteManualForm {...defaultProps} errors="Unexpected token" />);
    expect(screen.getByTestId('workflow-input-validation-callout')).toBeInTheDocument();
    expect(screen.getByText('Unexpected token')).toBeInTheDocument();
  });

  it('should not show error callout when errors is null', () => {
    renderWithProviders(<StepExecuteManualForm {...defaultProps} errors={null} />);
    expect(screen.queryByText('Invalid JSON')).not.toBeInTheDocument();
  });

  it('should show warnings callout when warnings is provided', () => {
    renderWithProviders(
      <StepExecuteManualForm {...defaultProps} warnings="requiredField: Required" />
    );
    expect(screen.getByTestId('workflow-input-warnings-callout')).toBeInTheDocument();
    expect(screen.getByText('Input data does not match the expected shape')).toBeInTheDocument();
    expect(screen.getByText('requiredField: Required')).toBeInTheDocument();
  });

  it('should not show warnings callout when warnings is null', () => {
    renderWithProviders(<StepExecuteManualForm {...defaultProps} warnings={null} />);
    expect(screen.queryByTestId('workflow-input-warnings-callout')).not.toBeInTheDocument();
  });
});
