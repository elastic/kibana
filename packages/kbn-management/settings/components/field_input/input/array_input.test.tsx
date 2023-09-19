/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ArrayInput } from './array_input';
import { TEST_SUBJ_PREFIX_FIELD } from '.';
import { wrap } from '../mocks';

const name = 'Some array field';
const id = 'some:array:field';

describe('ArrayInput', () => {
  const defaultProps = {
    id,
    name,
    ariaLabel: 'Test',
    onChange: jest.fn(),
    value: ['foo', 'bar'],
  };

  beforeEach(() => {
    defaultProps.onChange.mockClear();
  });

  it('renders without errors', () => {
    const { container } = render(wrap(<ArrayInput {...defaultProps} />));
    expect(container).toBeInTheDocument();
  });

  it('renders an array of strings', () => {
    render(wrap(<ArrayInput {...defaultProps} />));
    expect(screen.getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`)).toHaveValue('foo, bar');
  });

  it('formats array when blurred', () => {
    render(wrap(<ArrayInput {...defaultProps} />));
    const input = screen.getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    fireEvent.focus(input);
    userEvent.type(input, ',baz');
    expect(input).toHaveValue('foo, bar,baz');
    input.blur();
    expect(input).toHaveValue('foo, bar, baz');
  });

  it('only calls onChange when blurred ', () => {
    render(wrap(<ArrayInput {...defaultProps} />));
    const input = screen.getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);

    fireEvent.focus(input);
    userEvent.type(input, ',baz');

    expect(input).toHaveValue('foo, bar,baz');
    expect(defaultProps.onChange).not.toHaveBeenCalled();

    act(() => {
      input.blur();
    });

    expect(defaultProps.onChange).toHaveBeenCalledWith({ value: ['foo', 'bar', 'baz'] });
  });

  it('disables the input when isDisabled prop is true', () => {
    const { getByTestId } = render(wrap(<ArrayInput {...defaultProps} isDisabled />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(input).toBeDisabled();
  });
});
