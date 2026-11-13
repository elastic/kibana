/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { ChangeHistoryPreviewEditorContext } from '@kbn/change-history-ui';
import { I18nProvider } from '@kbn/i18n-react';
import type { YamlValidationResult } from '@kbn/workflows-yaml';
import { useWorkflowChangeHistoryPreviewValidation } from './use_workflow_change_history_preview_validation';
import { WorkflowChangeHistoryPreviewValidation } from './workflow_change_history_preview_validation';

jest.mock('./use_workflow_change_history_preview_validation');

jest.mock('../validate_workflow_yaml/lib/workflow_yaml_computation_cache', () => ({
  clearWorkflowYamlComputationCache: jest.fn(),
}));

jest.mock('../../widgets/workflow_yaml_editor/ui/workflow_yaml_validation_accordion', () => ({
  WORKFLOW_YAML_VALIDATION_ACCORDION_CLASS: 'workflowYamlValidationAccordion',
  WorkflowYamlValidationAccordion: ({
    validationErrors,
    isLoading,
    error,
  }: {
    validationErrors?: YamlValidationResult[] | null;
    isLoading?: boolean;
    error?: Error | null;
  }) => (
    <div data-test-subj="workflowYamlEditorValidationErrorsList">
      {isLoading || validationErrors === null
        ? 'Initializing validation...'
        : error
        ? `Validation failed: ${error.message}`
        : !validationErrors || validationErrors.length === 0
        ? 'No validation errors'
        : `${validationErrors.length} error(s)`}
    </div>
  ),
}));

const sampleError: YamlValidationResult = {
  id: 'custom-error',
  owner: 'step-name-validation',
  ruleId: 'duplicateStepName',
  severity: 'error',
  message: 'Duplicate step name',
  startLineNumber: 2,
  startColumn: 1,
  endLineNumber: 2,
  endColumn: 10,
  hoverMessage: null,
  afterMessage: null,
};

const mockUseValidation = jest.mocked(useWorkflowChangeHistoryPreviewValidation);

const context = {
  isEditorMounted: true,
  decorationsRef: { current: null },
} as unknown as ChangeHistoryPreviewEditorContext;

const renderValidation = ({
  highlightValidationErrors = true,
  validationResults = [],
  isValidationLoading = false,
  validationError = null,
}: {
  highlightValidationErrors?: boolean;
  validationResults?: YamlValidationResult[];
  isValidationLoading?: boolean;
  validationError?: Error | null;
} = {}) => {
  mockUseValidation.mockReturnValue({
    validationResults,
    isValidationLoading,
    validationError,
    handleValidationErrorClick: jest.fn(),
  });

  return render(
    <I18nProvider>
      <WorkflowChangeHistoryPreviewValidation
        context={context}
        highlightValidationErrors={highlightValidationErrors}
        validationYaml="name: test"
      />
    </I18nProvider>
  );
};

describe('WorkflowChangeHistoryPreviewValidation', () => {
  it('shows initializing state while validation is loading and no results exist yet', () => {
    renderValidation({ isValidationLoading: true });

    expect(screen.getByText('Initializing validation...')).toBeInTheDocument();
  });

  it('hides validation results while validation is still in progress', () => {
    renderValidation({ isValidationLoading: true, validationResults: [sampleError] });

    expect(screen.getByText('Initializing validation...')).toBeInTheDocument();
    expect(screen.queryByText('1 error(s)')).not.toBeInTheDocument();
  });

  it('shows validation results after loading completes', () => {
    renderValidation({ validationResults: [sampleError] });

    expect(screen.getByText('1 error(s)')).toBeInTheDocument();
    expect(screen.queryByText('Initializing validation...')).not.toBeInTheDocument();
  });

  it('shows operational validation failures separately from diagnostics', () => {
    renderValidation({ validationError: new Error('Connector metadata is unavailable') });

    expect(
      screen.getByText('Validation failed: Connector metadata is unavailable')
    ).toBeInTheDocument();
  });

  it('wraps the validation accordion to reserve space for the settings button', () => {
    renderValidation();

    expect(
      screen.getByTestId('workflowChangeHistoryPreviewValidationAccordion')
    ).toBeInTheDocument();
    expect(screen.getByTestId('workflowYamlEditorValidationErrorsList')).toBeInTheDocument();
  });

  it('renders no accordion when validation highlighting is disabled', () => {
    renderValidation({ highlightValidationErrors: false });

    expect(screen.queryByTestId('workflowYamlEditorValidationErrorsList')).not.toBeInTheDocument();
  });
});
