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
import { SuggestionComponent } from './suggestion_component';
import { QuerySuggestion, QuerySuggestionTypes } from '../autocomplete';
import { userEvent } from '@testing-library/user-event';

const noop = () => {};

const mockSuggestion: QuerySuggestion = {
  description: 'This is not a helpful suggestion',
  end: 0,
  start: 42,
  text: 'as promised, not helpful',
  type: QuerySuggestionTypes.Value,
};

describe('SuggestionComponent', () => {
  it('displays the suggestion and uses the provided ariaId', () => {
    render(
      <SuggestionComponent
        index={0}
        onClick={noop}
        onMouseEnter={noop}
        selected={false}
        suggestion={mockSuggestion}
        innerRef={noop}
        ariaId="suggestion-1"
        shouldDisplayDescription={true}
      />
    );

    const item = screen.getByText(/as promised, not helpful/i);
    expect(item).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /as promised, not helpful/i })).toHaveAttribute(
      'id',
      'suggestion-1'
    );
  });

  it('marks element as active when selected', () => {
    render(
      <SuggestionComponent
        index={0}
        onClick={noop}
        onMouseEnter={noop}
        selected={true}
        suggestion={mockSuggestion}
        innerRef={noop}
        ariaId="suggestion-1"
        shouldDisplayDescription={true}
      />
    );
    expect(screen.getByRole('option', { name: /as promised, not helpful/i })).toHaveAttribute(
      'id',
      'suggestion-1'
    );
    expect(screen.getByRole('option', { name: /as promised, not helpful/i })).toHaveClass(
      'kbnTypeahead__item active'
    );
  });

  it('calls innerRef with the reference to the root element', () => {
    const innerRefMock = jest.fn();

    render(
      <SuggestionComponent
        index={0}
        onClick={noop}
        onMouseEnter={noop}
        selected={false}
        suggestion={mockSuggestion}
        innerRef={innerRefMock}
        ariaId="suggestion-1"
        shouldDisplayDescription={true}
      />
    );

    expect(innerRefMock).toHaveBeenCalledTimes(1);
    const [indexArg, elementArg] = innerRefMock.mock.calls[0];
    expect(indexArg).toBe(0);
    expect(elementArg).toBeInstanceOf(HTMLDivElement);
    expect(elementArg?.id).toBe('suggestion-1');
    expect(elementArg?.className).toContain('kbnTypeahead__item');
  });

  it('calls onClick with suggestion and index', async () => {
    const clickHandler = jest.fn();

    render(
      <SuggestionComponent
        index={0}
        onClick={clickHandler}
        onMouseEnter={noop}
        selected={false}
        suggestion={mockSuggestion}
        innerRef={noop}
        ariaId="suggestion-1"
        shouldDisplayDescription={true}
      />
    );

    await userEvent.click(screen.getByText(/as promised, not helpful/i));
    expect(clickHandler).toHaveBeenCalledWith(mockSuggestion, 0);
    expect(clickHandler).toHaveBeenCalledTimes(1);
  });

  it('calls onMouseEnter when user hovers the element', async () => {
    const mouseEnterHandler = jest.fn();

    render(
      <SuggestionComponent
        index={0}
        onClick={noop}
        onMouseEnter={mouseEnterHandler}
        selected={false}
        suggestion={mockSuggestion}
        innerRef={noop}
        ariaId="suggestion-1"
        shouldDisplayDescription={true}
      />
    );

    await userEvent.hover(screen.getByText(/as promised, not helpful/i));
    expect(mouseEnterHandler).toHaveBeenCalledTimes(1);
  });
});
