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
import type { StepExecuteModalProps } from './step_execute_modal';
import { StepExecuteModal } from './step_execute_modal';

jest.mock('../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme', () => ({
  useWorkflowsMonacoTheme: jest.fn(),
  WORKFLOWS_MONACO_EDITOR_THEME: 'test-theme',
}));

jest.mock('./step_execute_manual_form', () => ({
  StepExecuteManualForm: ({ value, onChange, errors }: any) => (
    <div data-test-subj="mockManualForm">
      <span data-test-subj="manualFormValue">{value}</span>
      {errors && <span data-test-subj="manualFormErrors">{errors}</span>}
      <button data-test-subj="manualFormChange" onClick={() => onChange('{"updated":"value"}')}>
        change
      </button>
      <button data-test-subj="manualFormInvalidChange" onClick={() => onChange('invalid-json')}>
        invalid change
      </button>
    </div>
  ),
}));

jest.mock('./step_execute_historical_form', () => ({
  NOT_READY_SENTINEL: '__step_historical_not_ready__',
  StepExecuteHistoricalForm: ({ value, setValue, errors, setErrors, stepId }: any) => (
    <div data-test-subj="mockHistoricalForm">
      <span data-test-subj="historicalFormValue">{value}</span>
      <span data-test-subj="historicalFormStepId">{stepId}</span>
      <button
        data-test-subj="historicalFormChange"
        onClick={() => setValue('{"historical":"input"}')}
      >
        load execution
      </button>
      <button
        data-test-subj="historicalFormSetNotReady"
        onClick={() => setErrors('__step_historical_not_ready__')}
      >
        set not ready
      </button>
      <button data-test-subj="historicalFormSetError" onClick={() => setErrors('Some error')}>
        set error
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
    schema: {} as any,
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
    it('should render the modal with title and description', () => {
      renderWithProviders(defaultProps);
      expect(screen.getByTestId('workflowTestStepModal')).toBeInTheDocument();
      expect(screen.getByText('Test step')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Test run with current changes and provided payload. Will not be saved in history.'
        )
      ).toBeInTheDocument();
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
      expect(screen.getByText('Enter or edit JSON input manually.')).toBeInTheDocument();
      expect(screen.getByText('Reuse input from a previous step run.')).toBeInTheDocument();
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

    it('should respect initialTab prop over initialStepExecutionId', () => {
      renderWithProviders({
        ...defaultProps,
        initialStepExecutionId: 'exec-1',
        initialTab: 'manual',
      });
      expect(screen.getByTestId('mockManualForm')).toBeInTheDocument();
      expect(screen.queryByTestId('mockHistoricalForm')).not.toBeInTheDocument();
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
    it('should call onSubmit with step inputs when Run is clicked', () => {
      renderWithProviders(defaultProps);
      fireEvent.click(screen.getByTestId('workflowSubmitStepRun'));
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        stepInputs: { inputs: { key: 'value' } },
      });
    });

    it('should call onSubmit with updated inputs after manual edit', () => {
      renderWithProviders(defaultProps);
      fireEvent.click(screen.getByTestId('manualFormChange'));
      fireEvent.click(screen.getByTestId('workflowSubmitStepRun'));
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        stepInputs: { inputs: { updated: 'value' } },
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
          schema: {} as any,
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
});
