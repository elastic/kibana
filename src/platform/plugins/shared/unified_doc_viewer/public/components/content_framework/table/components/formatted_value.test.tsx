/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormattedValue } from './formatted_value';

describe('FormattedValue', () => {
  it('renders React nodes directly', () => {
    render(<FormattedValue value={<mark>React Node Value</mark>} />);
    const markElement = screen.getByText('React Node Value');
    expect(markElement.tagName.toLowerCase()).toBe('mark');
  });

  it('renders plain text if value is a string', () => {
    render(<FormattedValue value="Just text" />);
    expect(screen.getByText('Just text')).toBeInTheDocument();
  });

  it('renders empty if value is empty string', () => {
    render(<FormattedValue value="" />);
    const euiText = screen.getByTestId('ContentFrameworkTableFormattedValue');
    expect(euiText.textContent).toBe('');
  });

  it('renders null/undefined as empty', () => {
    render(<FormattedValue value={null} />);
    const euiText = screen.getByTestId('ContentFrameworkTableFormattedValue');
    expect(euiText.textContent).toBe('');
  });
});
