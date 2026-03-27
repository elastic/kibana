/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { WorkflowExecuteManualForm } from './workflow_execute_manual_form';

// Mock CodeEditor
jest.mock('@kbn/code-editor', () => ({
  CodeEditor: (props: any) => (
    <textarea
      data-test-subj={props.dataTestSubj || 'code-editor'}
      value={props.value}
      onChange={(e) => props.onChange?.(e.target.value)}
      readOnly={props.options?.readOnly}
      aria-label={props['aria-label']}
    />
  ),
  monaco: {
    languages: {
      json: {
        jsonDefaults: {
          setDiagnosticsOptions: jest.fn(),
        },
      },
    },
    editor: {},
  },
}));

// Mock input validation callout
jest.mock('./input_validation_callout', () => ({
  InputValidationCallout: ({ errors }: { errors: string }) => (
    <div data-test-subj="workflow-input-validation-callout">{errors}</div>
  ),
}));

// Mock buildFieldsZodValidator
jest.mock('@kbn/workflows/spec/lib/build_fields_zod_validator', () => ({
  buildFieldsZodValidator: jest.fn(() => ({
    safeParse: jest.fn(() => ({ success: true })),
  })),
}));

// Mock applyInputDefaults
jest.mock('@kbn/workflows/spec/lib/field_conversion', () => ({
  applyInputDefaults: jest.fn(() => ({})),
}));

// Mock generateSampleFromJsonSchema
jest.mock('../../../../common/lib/generate_sample_from_json_schema', () => ({
  generateSampleFromJsonSchema: jest.fn(() => 'sample-value'),
}));

// Mock theme constant
jest.mock('../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme', () => ({
  WORKFLOWS_MONACO_EDITOR_THEME: 'workflows-theme',
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(component, { wrapper: I18nProvider });
};

describe('WorkflowExecuteManualForm', () => {
  let mockSetValue: jest.Mock;
  let mockSetErrors: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetValue = jest.fn();
    mockSetErrors = jest.fn();
  });

  it('should render the form with Input Data label', () => {
    renderWithProviders(
      <WorkflowExecuteManualForm
        value="{}"
        setValue={mockSetValue}
        errors={null}
        setErrors={mockSetErrors}
      />
    );

    expect(screen.getByText('Input Data')).toBeInTheDocument();
  });

  it('should display the validation callout when errors are present', () => {
    renderWithProviders(
      <WorkflowExecuteManualForm
        value='{"key": "value"}'
        setValue={mockSetValue}
        errors="name: Required"
        setErrors={mockSetErrors}
      />
    );

    expect(screen.getByTestId('workflow-input-validation-callout')).toBeInTheDocument();
    expect(screen.getByText('name: Required')).toBeInTheDocument();
  });

  it('should not display the validation callout when there are no errors', () => {
    renderWithProviders(
      <WorkflowExecuteManualForm
        value='{"key": "value"}'
        setValue={mockSetValue}
        errors={null}
        setErrors={mockSetErrors}
      />
    );

    expect(screen.queryByTestId('workflow-input-validation-callout')).not.toBeInTheDocument();
  });

  it('should call setValue with default inputs on mount', () => {
    renderWithProviders(
      <WorkflowExecuteManualForm
        value=""
        setValue={mockSetValue}
        errors={null}
        setErrors={mockSetErrors}
      />
    );

    // The useEffect should call setValue with the default workflow input
    expect(mockSetValue).toHaveBeenCalledWith(expect.any(String));
  });
});
