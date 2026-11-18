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
    setActiveDataReferenceInsertTarget(insert);
  });

  afterEach(() => {
    clearActiveDataReferenceInsertTarget(insert);
  });

  it('inserts the reference token into the active field when a row is clicked', () => {
    renderSection();

    // The field and value columns are both reference sources with this test subject.
    const [fieldCell] = screen.getAllByTestId('workflowExecutionOutputField-status');
    fireEvent.click(fieldCell);

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith('{{ steps.fetch.output.status }}');
  });

  it('copies the field path without also inserting it into the open step form', () => {
    renderSection();

    fireEvent.click(screen.getByTestId('workflowExecutionStepDataCopyFieldPath'));

    expect(copyToClipboard).toHaveBeenCalledWith('steps.fetch.output.status');
    expect(insert).not.toHaveBeenCalled();
  });
});
