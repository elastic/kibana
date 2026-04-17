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
import { z } from '@kbn/zod/v4';
import type { StepExecuteModalProps } from './step_execute_modal';
import { StepExecuteModal } from './step_execute_modal';

jest.mock('../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme', () => ({
  useWorkflowsMonacoTheme: jest.fn(),
  WORKFLOWS_MONACO_EDITOR_THEME: 'test-theme',
}));

jest.mock('./step_execute_manual_form', () => ({
  StepExecuteManualForm: ({ value, setValue, errors, warnings }: any) => (
    <div data-test-subj="mockManualForm">
      <span data-test-subj="manualFormValue">{value}</span>
      {errors && <span data-test-subj="manualFormErrors">{errors}</span>}
      {warnings && <span data-test-subj="manualFormWarnings">{warnings}</span>}
      <button
        data-test-subj="manualFormChange"
        onClick={() => setValue('{"updated":"value"}')}
        type="button"
      >
        {'change'}
      </button>
      <button
        data-test-subj="manualFormInvalidChange"
        onClick={() => setValue('invalid-json')}
        type="button"
      >
        {'invalid change'}
      </button>
      <button
        data-test-subj="manualFormValidMatchingSchema"
        onClick={() => setValue('{"requiredField":"ok"}')}
        type="button"
      >
        {'valid matching schema'}
      </button>
    </div>
  ),
}));

jest.mock('./step_execute_historical_form', () => ({
  NOT_READY_SENTINEL: '__step_historical_not_ready__',
  StepExecuteHistoricalForm: ({
    value,
    setValue,
    setErrors,
    setExecutionContext,
    stepId,
    warnings,
  }: any) => (
    <div data-test-subj="mockHistoricalForm">
      <span data-test-subj="historicalFormValue">{value}</span>
      <span data-test-subj="historicalFormStepId">{stepId}</span>
      {warnings && <span data-test-subj="historicalFormWarnings">{warnings}</span>}
      <button
        data-test-subj="historicalFormChange"
        onClick={() => setValue('{"historical":"input"}')}
        type="button"
      >
        {'load execution'}
      </button>
      <button
        data-test-subj="historicalFormSetNotReady"
        onClick={() => setErrors('__step_historical_not_ready__')}
        type="button"
      >
        {'set not ready'}
      </button>
      <button
        data-test-subj="historicalFormSetError"
        onClick={() => setErrors('Some error')}
        type="button"
      >
        {'set error'}
      </button>
      <button
        data-test-subj="historicalFormSetExecutionContext"
        onClick={() => setExecutionContext({ key: 'value' })}
        type="button"
      >
        {'set execution context'}
      </button>
    </div>
  ),
}));

const renderWithProviders = (props: StepExecuteModalProps) => {
  return render(<StepExecuteModal {...props} />, { wrapper: I18nProvider });
};

describe('StepExecuteModal', () => {
  const defaultContextOverride = {
    stepContext: { inputs: { key: 'value' } },
    schema: z.object({}),
  };

  const defaultProps: StepExecuteModalProps = {
    initialcontextOverride: defaultContextOverride,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    stepId: 'my_step',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the modal with title', () => {
      renderWithProviders(defaultProps);
      expect(screen.getByTestId('workflowTestStepModal')).toBeInTheDocument();
      expect(screen.getByText(/Test.*my_step.*step/)).toBeInTheDocument();
    });

    it('should render the Run button', () => {
      renderWithProviders(defaultProps);
      expect(screen.getByTestId('workflowSubmitStepRun')).toBeInTheDocument();
      expect(screen.getByText('Run')).toBeInTheDocument();
    });

    it('should render tab radio buttons for Manual and Historical', () => {
      renderWithProviders(defaultProps);
      expect(screen.getByText('Manual')).toBeInTheDocument();
      expect(screen.getByText('Historical')).toBeInTheDocument();
    });

    it('should render tab descriptions', () => {
      renderWithProviders(defaultProps);
      expect(screen.getByText('Provide custom JSON data manually')).toBeInTheDocument();
      expect(
        screen.getByText('Reuse input data from previous step executions')
      ).toBeInTheDocument();
    });
  });

  describe('default tab selection', () => {
    it('should default to manual tab when no initialStepExecutionId', () => {
      renderWithProviders(defaultProps);
      expect(screen.getByTestId('mockManualForm')).toBeInTheDocument();
      expect(screen.queryByTestId('mockHistoricalForm')).not.toBeInTheDocument();
    });

    it('should default to historical tab when initialStepExecutionId is provided', () => {
      renderWithProviders({
        ...defaultProps,
        initialStepExecutionId: 'exec-1',
      });
      expect(screen.getByTestId('mockHistoricalForm')).toBeInTheDocument();
      expect(screen.queryByTestId('mockManualForm')).not.toBeInTheDocument();
    });
  });

  describe('tab switching', () => {
    it('should switch to historical tab when Historical button is clicked', () => {
      renderWithProviders(defaultProps);
      expect(screen.getByTestId('mockManualForm')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Historical'));

      expect(screen.getByTestId('mockHistoricalForm')).toBeInTheDocument();
      expect(screen.queryByTestId('mockManualForm')).not.toBeInTheDocument();
    });

    it('should switch back to manual tab when Manual button is clicked', () => {
      renderWithProviders(defaultProps);

      fireEvent.click(screen.getByText('Historical'));
      expect(screen.getByTestId('mockHistoricalForm')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Manual'));
      expect(screen.getByTestId('mockManualForm')).toBeInTheDocument();
      expect(screen.queryByTestId('mockHistoricalForm')).not.toBeInTheDocument();
    });

    it('should reset input to initial value when switching tabs', () => {
      renderWithProviders(defaultProps);

      fireEvent.click(screen.getByTestId('manualFormChange'));

      fireEvent.click(screen.getByText('Historical'));
      fireEvent.click(screen.getByText('Manual'));

      expect(screen.getByTestId('manualFormValue')).toHaveTextContent('"key": "value"');
    });
  });

  describe('submit behavior', () => {
    it('should call onSubmit with parameters when Run is clicked', () => {
      renderWithProviders(defaultProps);
      fireEvent.click(screen.getByTestId('workflowSubmitStepRun'));
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        stepInputs: { inputs: { key: 'value' } },
        executionContext: undefined,
        triggerTab: 'manual',
      });
    });

    it('should call onSubmit with parameters when Run is clicked with executionContext', () => {
      renderWithProviders({
        ...defaultProps,
        initialStepExecutionId: 'exec-1',
      });
      fireEvent.click(screen.getByTestId('historicalFormSetExecutionContext'));
      fireEvent.click(screen.getByTestId('workflowSubmitStepRun'));
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        stepInputs: { inputs: { key: 'value' } },
        executionContext: { key: 'value' },
        triggerTab: 'historical',
      });
    });

    it('should disable submit when on historical tab and there is an error', () => {
      renderWithProviders({
        ...defaultProps,
        initialStepExecutionId: 'exec-1',
      });
      fireEvent.click(screen.getByTestId('historicalFormSetError'));
      expect(screen.getByTestId('workflowSubmitStepRun')).toBeDisabled();
    });

    it('should disable submit when historical form signals not ready', () => {
      renderWithProviders({
        ...defaultProps,
        initialStepExecutionId: 'exec-1',
      });
      fireEvent.click(screen.getByTestId('historicalFormSetNotReady'));
      expect(screen.getByTestId('workflowSubmitStepRun')).toBeDisabled();
    });

    it('should not disable submit for errors on the manual tab', () => {
      renderWithProviders(defaultProps);
      fireEvent.click(screen.getByTestId('manualFormInvalidChange'));
      expect(screen.getByTestId('workflowSubmitStepRun')).not.toBeDisabled();
    });
  });

  describe('onClose', () => {
    it('should call onClose when modal close is triggered', () => {
      renderWithProviders(defaultProps);
      const closeButton = screen.getByLabelText('Closes this modal window');
      fireEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('initial inputs', () => {
    it('should initialize with empty object when stepContext.inputs is undefined', () => {
      renderWithProviders({
        ...defaultProps,
        initialcontextOverride: {
          stepContext: {},
          schema: z.object({}),
        },
      });
      expect(screen.getByTestId('manualFormValue')).toHaveTextContent('{}');
    });

    it('should pass stepId to the historical form', () => {
      renderWithProviders({
        ...defaultProps,
        initialStepExecutionId: 'exec-1',
      });
      expect(screen.getByTestId('historicalFormStepId')).toHaveTextContent('my_step');
    });
  });

  describe('schema validation warnings', () => {
    it('should set and pass warnings to manual form when data does not match schema', () => {
      const schemaWithRequired = z.object({
        requiredField: z.string(),
      });
      renderWithProviders({
        ...defaultProps,
        initialcontextOverride: {
          stepContext: { inputs: { key: 'value' } },
          schema: schemaWithRequired,
        },
      });
      expect(screen.getByTestId('manualFormWarnings')).toBeInTheDocument();
      expect(screen.getByTestId('manualFormWarnings')).toHaveTextContent('requiredField');
    });

    it('should pass warnings to historical form when data does not match schema', () => {
      const schemaWithRequired = z.object({
        requiredField: z.string(),
      });
      renderWithProviders({
        ...defaultProps,
        initialStepExecutionId: 'exec-1',
        initialcontextOverride: {
          stepContext: { inputs: { key: 'value' } },
          schema: schemaWithRequired,
        },
      });
      expect(screen.getByTestId('historicalFormWarnings')).toBeInTheDocument();
      expect(screen.getByTestId('historicalFormWarnings')).toHaveTextContent('requiredField');
    });

    it('should clear warnings when user enters valid JSON that matches schema', () => {
      const schemaWithRequired = z.object({
        requiredField: z.string(),
      });
      renderWithProviders({
        ...defaultProps,
        initialcontextOverride: {
          stepContext: { inputs: { key: 'value' } },
          schema: schemaWithRequired,
        },
      });
      expect(screen.getByTestId('manualFormWarnings')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('manualFormValidMatchingSchema'));

      expect(screen.queryByTestId('manualFormWarnings')).not.toBeInTheDocument();
    });

    it('should clear warnings when JSON becomes invalid', () => {
      const schemaWithRequired = z.object({
        requiredField: z.string(),
      });
      renderWithProviders({
        ...defaultProps,
        initialcontextOverride: {
          stepContext: { inputs: { key: 'value' } },
          schema: schemaWithRequired,
        },
      });
      expect(screen.getByTestId('manualFormWarnings')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('manualFormInvalidChange'));

      expect(screen.queryByTestId('manualFormWarnings')).not.toBeInTheDocument();
      expect(screen.getByTestId('manualFormErrors')).toBeInTheDocument();
    });

    it('should not show warnings when data matches schema', () => {
      renderWithProviders(defaultProps);
      expect(screen.queryByTestId('manualFormWarnings')).not.toBeInTheDocument();
    });
  });
});
