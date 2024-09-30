/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RuleActions } from './rule_actions';

const mockOnChange = jest.fn();

describe('Rule actions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Renders correctly', () => {
    render(<RuleActions onClick={mockOnChange} />);

    expect(screen.getByTestId('ruleActions')).toBeInTheDocument();
  });

  test('Calls onChange when button is click', () => {
    render(<RuleActions onClick={mockOnChange} />);

    fireEvent.click(screen.getByTestId('ruleActionsAddActionButton'));

    expect(mockOnChange).toHaveBeenCalled();
  });
});
