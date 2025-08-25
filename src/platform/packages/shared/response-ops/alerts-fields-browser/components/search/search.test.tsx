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
import userEvent from '@testing-library/user-event';
import { Search } from './search';

describe('Search', () => {
  test('renders placeholder text when searchInput is empty', () => {
    render(<Search isSearching={false} onSearchInputChange={jest.fn()} searchInput="" />);
    expect(screen.getByPlaceholderText('Field name')).toBeInTheDocument();
  });

  test('renders the current search value when searchInput is not empty', () => {
    const value = 'aFieldName';
    render(<Search isSearching={false} onSearchInputChange={jest.fn()} searchInput={value} />);
    expect(screen.getByDisplayValue(value)).toBeInTheDocument();
  });

  test('shows loading spinner when isSearching is true', () => {
    render(<Search isSearching={true} onSearchInputChange={jest.fn()} searchInput="" />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('invokes onSearchInputChange on user typing', async () => {
    const onSearchInputChange = jest.fn();
    const user = userEvent.setup();

    render(<Search isSearching={false} onSearchInputChange={onSearchInputChange} searchInput="" />);

    const input = screen.getByTestId('field-search');

    await user.type(input, 'timestamp');
    
    expect(onSearchInputChange).toHaveBeenCalled();
  });
});
