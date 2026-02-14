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
  it('renders React content including HTML elements inside EuiText', () => {
    render(
      <FormattedValue>
        <mark>Inner HTML Value</mark>
      </FormattedValue>
    );
    const markElement = screen.getByText('Inner HTML Value');
    expect(markElement.tagName.toLowerCase()).toBe('mark');
  });

  it('renders plain text children', () => {
    render(<FormattedValue>Just text</FormattedValue>);
    expect(screen.getByText('Just text')).toBeInTheDocument();
  });

  it('renders empty if children is empty', () => {
    render(<FormattedValue>{''}</FormattedValue>);
    const euiText = screen.getByTestId('ContentFrameworkTableFormattedValue');
    expect(euiText.textContent).toBe('');
  });
});
