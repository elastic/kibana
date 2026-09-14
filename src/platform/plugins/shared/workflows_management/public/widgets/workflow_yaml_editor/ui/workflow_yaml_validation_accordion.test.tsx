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

function selectText(node: Node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
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
    expect(
      screen.queryByTestId('workflowYamlValidationErrorFixWithAiButton')
    ).not.toBeInTheDocument();
  });

  it('renders a Fix with AI button when onFixWithAi is provided', () => {
    const onFixWithAi = jest.fn();
    renderAccordion({ onFixWithAi });
    expandAccordion();

    expect(screen.getByTestId('workflowYamlValidationErrorFixWithAiButton')).toBeInTheDocument();
    expect(screen.getByLabelText('Fix with AI Agent')).toBeInTheDocument();
  });

  it('navigates to the error when the message is clicked without a text selection', () => {
    const { onErrorClick } = renderAccordion();
    expandAccordion();

    fireEvent.click(screen.getByTestId('workflowYamlValidationErrorMessage'));

    expect(onErrorClick).toHaveBeenCalledTimes(1);
    expect(onErrorClick).toHaveBeenCalledWith(sampleError);
  });

  it('does not navigate when the user has selected the error text', () => {
    const { onErrorClick } = renderAccordion();
    expandAccordion();

    const trigger = screen.getByTestId('workflowYamlValidationErrorMessage');
    selectText(trigger);
    fireEvent.click(trigger);

    expect(onErrorClick).not.toHaveBeenCalled();
  });

  it('navigates when the selection is elsewhere on the page, such as the editor', () => {
    const outside = document.createElement('p');
    outside.textContent = 'name: some workflow';
    document.body.appendChild(outside);

    const { onErrorClick } = renderAccordion();
    expandAccordion();

    selectText(outside);
    fireEvent.click(screen.getByTestId('workflowYamlValidationErrorMessage'));

    expect(onErrorClick).toHaveBeenCalledWith(sampleError);
    outside.remove();
  });

  it('copies the error message without navigating', () => {
    const { onErrorClick } = renderAccordion();
    expandAccordion();

    fireEvent.click(screen.getByTestId('workflowYamlValidationErrorCopyButton'));

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(onErrorClick).not.toHaveBeenCalled();
  });

  it('calls onFixWithAi without navigating', () => {
    const onErrorClick = jest.fn();
    const onFixWithAi = jest.fn();
    renderAccordion({ onErrorClick, onFixWithAi });
    expandAccordion();

    fireEvent.click(screen.getByTestId('workflowYamlValidationErrorFixWithAiButton'));

    expect(onFixWithAi).toHaveBeenCalledWith(sampleError);
    expect(onErrorClick).not.toHaveBeenCalled();
  });

  it('closes itself when the last error goes away', () => {
    const { rerender } = renderAccordion();
    expandAccordion();
    expect(screen.getByTestId('workflowYamlValidationErrorRow')).toBeInTheDocument();

    rerender(
      <WorkflowYamlValidationAccordion
        isMounted={true}
        isLoading={false}
        error={null}
        validationErrors={[]}
      />
    );

    expect(screen.queryByTestId('workflowYamlValidationErrorRow')).not.toBeInTheDocument();
    expect(screen.queryByText('No validation errors')).toBeInTheDocument();
  });

  it('stays open while validation clears its results to reload', () => {
    const { rerender } = renderAccordion();
    expandAccordion();

    rerender(
      <WorkflowYamlValidationAccordion
        isMounted={true}
        isLoading={true}
        error={null}
        validationErrors={[]}
      />
    );
    rerender(
      <WorkflowYamlValidationAccordion
        isMounted={true}
        isLoading={false}
        error={null}
        validationErrors={[sampleError]}
        onErrorClick={jest.fn()}
      />
    );

    expect(screen.getByTestId('workflowYamlValidationErrorRow')).toBeInTheDocument();
  });

  it('navigates when Enter is pressed on the message', () => {
    const { onErrorClick } = renderAccordion();
    expandAccordion();

    fireEvent.keyDown(screen.getByTestId('workflowYamlValidationErrorMessage'), { key: 'Enter' });

    expect(onErrorClick).toHaveBeenCalledWith(sampleError);
  });
});
