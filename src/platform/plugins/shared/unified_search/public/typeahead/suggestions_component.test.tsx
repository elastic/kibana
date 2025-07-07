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
import { QuerySuggestion, QuerySuggestionTypes } from '../autocomplete';
import { SuggestionsComponent } from './suggestions_component';
import { EuiThemeProvider } from '@elastic/eui';
import { userEvent } from '@testing-library/user-event';

const noop = () => {};

const mockContainerDiv = document.createElement('div');

const mockSuggestions: QuerySuggestion[] = [
  {
    description: 'This is not a helpful suggestion',
    end: 0,
    start: 42,
    text: 'as promised, not helpful',
    type: QuerySuggestionTypes.Value,
  },
  {
    description: 'This is another unhelpful suggestion',
    end: 0,
    start: 42,
    text: 'yep',
    type: QuerySuggestionTypes.Field,
  },
];

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<EuiThemeProvider>{ui}</EuiThemeProvider>);
};

describe('SuggestionsComponent', () => {
  it('Should not render if show is false', () => {
    const { container } = renderWithTheme(
      <SuggestionsComponent
        index={0}
        onClick={noop}
        onMouseEnter={noop}
        show={false}
        suggestions={mockSuggestions}
        loadMore={noop}
        inputContainer={mockContainerDiv}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('Should not render if there are no suggestions', () => {
    const { container } = renderWithTheme(
      <SuggestionsComponent
        index={0}
        onClick={noop}
        onMouseEnter={noop}
        show={true}
        suggestions={[]}
        loadMore={noop}
        inputContainer={mockContainerDiv}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('Should render suggestions when show is true', () => {
    renderWithTheme(
      <SuggestionsComponent
        index={0}
        onClick={noop}
        onMouseEnter={noop}
        show={true}
        suggestions={mockSuggestions}
        loadMore={noop}
        inputContainer={mockContainerDiv}
      />
    );
    const items = screen.getAllByRole('option');
    expect(items).toHaveLength(2);
  });

  it('Should apply selection based on index prop', () => {
    renderWithTheme(
      <SuggestionsComponent
        index={1}
        onClick={noop}
        onMouseEnter={noop}
        show={true}
        suggestions={mockSuggestions}
        loadMore={noop}
        inputContainer={mockContainerDiv}
      />
    );

    const selected = screen.getAllByRole('option')[1];
    expect(selected.getAttribute('aria-selected')).toBe('true');
  });

  it('Should call onClick with selected suggestion when clicked', async () => {
    const mockClick = jest.fn();
    renderWithTheme(
      <SuggestionsComponent
        index={0}
        onClick={mockClick}
        onMouseEnter={noop}
        show={true}
        suggestions={mockSuggestions}
        loadMore={noop}
        inputContainer={mockContainerDiv}
      />
    );
    const item = screen.getAllByRole('option')[1];
    await userEvent.click(item);
    expect(mockClick).toHaveBeenCalledWith(mockSuggestions[1], 1);
  });

  it('Should call onMouseEnter with correct index when suggestion is hovered', async () => {
    const mockEnter = jest.fn();
    renderWithTheme(
      <SuggestionsComponent
        index={0}
        onClick={noop}
        onMouseEnter={mockEnter}
        show={true}
        suggestions={mockSuggestions}
        loadMore={noop}
        inputContainer={mockContainerDiv}
      />
    );
    const item = screen.getAllByRole('option')[1];
    await userEvent.hover(item);
    expect(mockEnter).toHaveBeenCalledWith(mockSuggestions[1], 1);
  });
});
