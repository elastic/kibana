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
import { I18nProvider } from '@kbn/i18n-react';
import { WorkflowChangeHistoryPreviewFooter } from './workflow_change_history_preview_footer';
import type { YamlValidationResult } from '../validate_workflow_yaml/model/types';

jest.mock('../../widgets/workflow_yaml_editor/ui/workflow_yaml_validation_accordion', () => ({
  WorkflowYamlValidationAccordion: ({
    validationErrors,
    isLoading,
  }: {
    validationErrors?: YamlValidationResult[] | null;
    isLoading?: boolean;
  }) => (
    <div data-test-subj="workflowYamlEditorValidationErrorsList">
      {isLoading || validationErrors === null
        ? 'Initializing validation...'
        : !validationErrors || validationErrors.length === 0
        ? 'No validation errors'
        : `${validationErrors.length} error(s)`}
    </div>
  ),
}));

const sampleError: YamlValidationResult = {
  id: 'custom-error',
  owner: 'step-name-validation',
  severity: 'error',
  message: 'Duplicate step name',
  startLineNumber: 2,
  startColumn: 1,
  endLineNumber: 2,
  endColumn: 10,
  hoverMessage: null,
  afterMessage: null,
};

const renderFooter = (
  props: Partial<React.ComponentProps<typeof WorkflowChangeHistoryPreviewFooter>> = {}
) =>
  render(
    <I18nProvider>
      <WorkflowChangeHistoryPreviewFooter
        validationResults={[]}
        isEditorMounted={true}
        isValidationLoading={false}
        highlightValidationErrors={true}
        {...props}
      />
    </I18nProvider>
  );

describe('WorkflowChangeHistoryPreviewFooter', () => {
  it('shows initializing state while validation is loading and no results exist yet', () => {
    renderFooter({
      isValidationLoading: true,
      validationResults: [],
    });

    expect(screen.getByText('Initializing validation...')).toBeInTheDocument();
  });

  it('hides validation results while validation is still in progress', () => {
    renderFooter({
      isValidationLoading: true,
      validationResults: [sampleError],
    });

    expect(screen.getByText('Initializing validation...')).toBeInTheDocument();
    expect(screen.queryByText('1 error(s)')).not.toBeInTheDocument();
  });

  it('shows validation results after loading completes', () => {
    renderFooter({
      isValidationLoading: false,
      validationResults: [sampleError],
    });

    expect(screen.getByText('1 error(s)')).toBeInTheDocument();
    expect(screen.queryByText('Initializing validation...')).not.toBeInTheDocument();
  });

  it('renders a spacer when highlight is disabled', () => {
    renderFooter({
      highlightValidationErrors: false,
      isValidationLoading: true,
      validationResults: [sampleError],
    });

    expect(screen.queryByTestId('workflowYamlEditorValidationErrorsList')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowChangeHistoryPreviewFooter')).toBeInTheDocument();
  });

  it('wraps the validation accordion to reserve space for the settings button', () => {
    renderFooter({ highlightValidationErrors: true });

    expect(
      screen.getByTestId('workflowChangeHistoryPreviewValidationAccordion')
    ).toBeInTheDocument();
    expect(screen.getByTestId('workflowYamlEditorValidationErrorsList')).toBeInTheDocument();
  });
});
