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
import { WorkflowYamlValidationAccordion } from './workflow_yaml_validation_accordion';
import type { YamlValidationResult } from '../../../features/validate_workflow_yaml/model/types';
import { TestProvider } from '../../../shared/mocks/test_providers';

const sampleError: YamlValidationResult = {
  id: 'err-1',
  severity: 'error',
  message: 'Variable steps.foo.output is invalid',
  owner: 'variable-validation',
  ruleId: 'invalidVariableReference',
  hoverMessage: null,
  startLineNumber: 12,
  startColumn: 5,
  endLineNumber: 12,
  endColumn: 20,
};

function renderAccordion(
  overrides: Partial<React.ComponentProps<typeof WorkflowYamlValidationAccordion>> = {}
) {
  const onErrorClick = jest.fn();
  const result = render(
    <WorkflowYamlValidationAccordion
      isMounted={true}
      isLoading={false}
      error={null}
      validationErrors={[sampleError]}
      onErrorClick={onErrorClick}
      {...overrides}
    />,
    { wrapper: TestProvider }
  );
  return { ...result, onErrorClick };
}

function expandAccordion() {
  fireEvent.click(screen.getByText('1 error'));
}

describe('WorkflowYamlValidationAccordion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.execCommand = jest.fn(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders selectable error text and a copy button', () => {
    renderAccordion();
    expandAccordion();

    const row = screen.getByTestId('workflowYamlValidationErrorRow');
    expect(row).toHaveTextContent('Variable steps.foo.output is invalid');
    expect(row).toHaveTextContent('Ln 12, Col 5');
    expect(row).toHaveTextContent('invalidVariableReference');
    expect(screen.getByTestId('workflowYamlValidationErrorCopyButton')).toBeInTheDocument();
  });

  it('navigates to the error when the row is clicked without a text selection', () => {
    const { onErrorClick } = renderAccordion();
    expandAccordion();

    fireEvent.click(screen.getByTestId('workflowYamlValidationErrorRow'));

    expect(onErrorClick).toHaveBeenCalledTimes(1);
    expect(onErrorClick).toHaveBeenCalledWith(sampleError);
  });

  it('does not navigate when the user has selected text', () => {
    const { onErrorClick } = renderAccordion();
    expandAccordion();

    const selectionSpy = jest.spyOn(window, 'getSelection').mockReturnValue({
      toString: () => 'steps.foo.output',
      removeAllRanges: jest.fn(),
      addRange: jest.fn(),
    } as unknown as Selection);

    fireEvent.click(screen.getByTestId('workflowYamlValidationErrorRow'));

    expect(onErrorClick).not.toHaveBeenCalled();
    selectionSpy.mockRestore();
  });

  it('copies the error message without navigating', () => {
    const { onErrorClick } = renderAccordion();
    expandAccordion();

    fireEvent.click(screen.getByTestId('workflowYamlValidationErrorCopyButton'));

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(onErrorClick).not.toHaveBeenCalled();
  });

  it('navigates when Enter is pressed on the row', () => {
    const { onErrorClick } = renderAccordion();
    expandAccordion();

    fireEvent.keyDown(screen.getByTestId('workflowYamlValidationErrorRow'), { key: 'Enter' });

    expect(onErrorClick).toHaveBeenCalledWith(sampleError);
  });
});
