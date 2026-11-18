/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { copyToClipboard } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { StepDataSection } from './step_data_section';
import {
  clearActiveDataReferenceInsertTarget,
  setActiveDataReferenceInsertTarget,
} from '../../../shared/lib/active_data_reference_insert_target';
import { TestProvider } from '../../../shared/mocks/test_providers';

const mockExperimentalFeatures = { enabled: true };
jest.mock('../../../hooks/use_workflows_experimental_ui_setting', () => ({
  useWorkflowsExperimentalUiSetting: () => mockExperimentalFeatures.enabled,
}));

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
}));

const renderSection = () =>
  render(
    <TestProvider>
      <StepDataSection
        label="Output"
        data={{ status: 'ok' }}
        fieldPathPrefix="steps.fetch.output"
      />
    </TestProvider>
  );

describe('StepDataSection reference sources', () => {
  const insert = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockExperimentalFeatures.enabled = true;
    setActiveDataReferenceInsertTarget(insert);
  });

  afterEach(() => {
    clearActiveDataReferenceInsertTarget(insert);
  });

  it('inserts the reference token into the active field when a row is clicked', () => {
    renderSection();

    fireEvent.click(screen.getByTestId('workflowExecutionOutputField-status'));

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith('{{ steps.fetch.output.status }}');
  });

  it('gives the field cell and the value cell their own test subjects', () => {
    renderSection();

    expect(screen.getByTestId('workflowExecutionOutputField-status')).toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionOutputField-status-value')).toBeInTheDocument();
  });

  it('offers no drag or click sources while the experimental features are off', () => {
    mockExperimentalFeatures.enabled = false;
    renderSection();

    expect(screen.queryByTestId('workflowExecutionOutputField-status')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('workflowExecutionOutputField-status-value')
    ).not.toBeInTheDocument();
    // Copying the field path is not an experimental feature.
    expect(screen.getByTestId('workflowExecutionStepDataCopyFieldPath')).toBeInTheDocument();
  });

  it('copies the field path without also inserting it into the open step form', () => {
    renderSection();

    fireEvent.click(screen.getByTestId('workflowExecutionStepDataCopyFieldPath'));

    expect(copyToClipboard).toHaveBeenCalledWith('steps.fetch.output.status');
    expect(insert).not.toHaveBeenCalled();
  });
});
