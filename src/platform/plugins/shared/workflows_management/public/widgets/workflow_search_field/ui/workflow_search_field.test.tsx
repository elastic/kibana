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
import { WorkflowSearchField } from './workflow_search_field';

describe('WorkflowSearchField', () => {
  const onSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the search input', () => {
    render(<WorkflowSearchField onSearch={onSearch} />);
    expect(screen.getByTestId('workflowSearchField')).toBeInTheDocument();
  });

  it('renders with the initial value', () => {
    render(<WorkflowSearchField onSearch={onSearch} initialValue="hello" />);
    const input = screen.getByTestId('workflowSearchField') as HTMLInputElement;
    expect(input.value).toBe('hello');
  });

  it('updates the input value when typing', () => {
    render(<WorkflowSearchField onSearch={onSearch} />);
    const input = screen.getByTestId('workflowSearchField') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test query' } });
    expect(input.value).toBe('test query');
  });

  it('renders with a custom placeholder', () => {
    render(<WorkflowSearchField onSearch={onSearch} placeholder="Find workflows" />);
    const input = screen.getByTestId('workflowSearchField') as HTMLInputElement;
    expect(input.placeholder).toBe('Find workflows');
  });

  it('updates the input when initialValue changes', () => {
    const { rerender } = render(<WorkflowSearchField onSearch={onSearch} initialValue="one" />);
    const input = screen.getByTestId('workflowSearchField') as HTMLInputElement;
    expect(input.value).toBe('one');

    rerender(<WorkflowSearchField onSearch={onSearch} initialValue="two" />);
    expect(input.value).toBe('two');
  });
});
