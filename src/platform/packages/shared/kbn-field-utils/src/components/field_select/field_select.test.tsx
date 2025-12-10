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
import { userEvent } from '@testing-library/user-event';
import { FieldSelect } from './field_select';

describe('FieldSelect', () => {
  const mockOnTypeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display placeholder when no type is selected', () => {
    render(<FieldSelect selectedType={null} onTypeChange={mockOnTypeChange} />);
    expect(screen.getByPlaceholderText('Select option')).toBeInTheDocument();
  });

  it('should render with selected type', () => {
    render(<FieldSelect selectedType="keyword" onTypeChange={mockOnTypeChange} />);
    const comboBox = screen.getByTestId('fieldTypeSelect');
    expect(comboBox).toBeInTheDocument();
    expect(screen.getByText('keyword')).toBeInTheDocument();
  });

  it('should call onTypeChange when a type is selected', async () => {
    const user = userEvent.setup();
    render(<FieldSelect selectedType={null} onTypeChange={mockOnTypeChange} />);

    const comboBox = screen.getByTestId('comboBoxToggleListButton');
    await user.click(comboBox);

    const keywordOption = screen.getByRole('option', { name: 'Keyword' });
    await user.click(keywordOption);

    expect(mockOnTypeChange).toHaveBeenCalledWith('keyword');
  });

  it('should call onTypeChange with null when selection is cleared', async () => {
    const user = userEvent.setup();
    render(<FieldSelect selectedType="keyword" onTypeChange={mockOnTypeChange} />);

    const clearButton = screen.getByTestId('comboBoxClearButton');
    await user.click(clearButton);

    expect(mockOnTypeChange).toHaveBeenCalledWith(null);
  });
});
