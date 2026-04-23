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
import { InputValidationCallout } from './input_validation_callout';

describe('InputValidationCallout', () => {
  it('renders nothing when neither errors nor warnings are provided', () => {
    const { container } = render(<InputValidationCallout />);
    expect(container.textContent).toBe('');
  });

  it('renders nothing when errors and warnings are null', () => {
    const { container } = render(<InputValidationCallout errors={null} warnings={null} />);
    expect(container.textContent).toBe('');
  });

  it('renders error callout when errors is provided', () => {
    render(<InputValidationCallout errors="Invalid JSON input" />);

    expect(screen.getByTestId('workflow-input-validation-callout')).toBeInTheDocument();
    expect(screen.getByText('Input data is not valid')).toBeInTheDocument();
    expect(screen.getByText('Invalid JSON input')).toBeInTheDocument();
  });

  it('renders warning callout when warnings is provided', () => {
    render(<InputValidationCallout warnings="Missing optional field" />);

    expect(screen.getByTestId('workflow-input-warnings-callout')).toBeInTheDocument();
    expect(screen.getByText('Input data does not match the expected shape')).toBeInTheDocument();
    expect(screen.getByText('Missing optional field')).toBeInTheDocument();
  });

  it('renders both callouts when both errors and warnings are provided', () => {
    render(
      <InputValidationCallout errors="Invalid JSON input" warnings="Missing optional field" />
    );

    expect(screen.getByTestId('workflow-input-validation-callout')).toBeInTheDocument();
    expect(screen.getByTestId('workflow-input-warnings-callout')).toBeInTheDocument();
    expect(screen.getByText('Invalid JSON input')).toBeInTheDocument();
    expect(screen.getByText('Missing optional field')).toBeInTheDocument();
  });

  it('does not render error callout when errors is null but warnings is set', () => {
    render(<InputValidationCallout errors={null} warnings="Some warning" />);

    expect(screen.queryByTestId('workflow-input-validation-callout')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflow-input-warnings-callout')).toBeInTheDocument();
  });

  it('does not render warning callout when warnings is null but errors is set', () => {
    render(<InputValidationCallout errors="Some error" warnings={null} />);

    expect(screen.getByTestId('workflow-input-validation-callout')).toBeInTheDocument();
    expect(screen.queryByTestId('workflow-input-warnings-callout')).not.toBeInTheDocument();
  });

  it('has displayName set to InputValidationCallout', () => {
    expect(InputValidationCallout.displayName).toBe('InputValidationCallout');
  });
});
