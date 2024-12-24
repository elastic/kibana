/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ArrayInput } from './array_input';
import { TEST_SUBJ_PREFIX_FIELD } from '.';
import { wrap } from '../mocks';
import { InputProps } from '../types';

const name = 'Some array field';
const id = 'some:array:field';

describe('ArrayInput', () => {
  const onInputChange = jest.fn();
  const defaultProps: InputProps<'array'> = {
    onInputChange,
    field: {
      name,
      type: 'array',
      ariaAttributes: {
        ariaLabel: name,
      },
      id,
      isOverridden: false,
      defaultValue: ['foo', 'bar'],
    },
    isSavingEnabled: true,
  };

  beforeEach(() => {
    onInputChange.mockClear();
  });

  it('renders without errors', () => {
    const { container } = render(wrap(<ArrayInput {...defaultProps} />));
    expect(container).toBeInTheDocument();
  });

  it('renders an array of strings', () => {
    render(wrap(<ArrayInput {...defaultProps} />));
    expect(screen.getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`)).toHaveValue('foo, bar');
  });

  it('renders saved value when present', () => {
    render(
      wrap(
        <ArrayInput
          {...defaultProps}
          field={{ ...defaultProps.field, savedValue: ['foo', 'bar', 'baz'] }}
        />
      )
    );
    expect(screen.getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`)).toHaveValue('foo, bar, baz');
  });

  it('calls the onInputChange prop when the value changes', async () => {
    render(wrap(<ArrayInput {...defaultProps} />));
    const input = screen.getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    fireEvent.change(input, { target: { value: 'foo, bar,baz' } });

    await waitFor(() =>
      expect(defaultProps.onInputChange).toHaveBeenCalledWith({
        type: 'array',
        unsavedValue: ['foo', 'bar', 'baz'],
      })
    );
  });

  it('disables the input when isDisabled prop is true', () => {
    const { getByTestId } = render(wrap(<ArrayInput {...defaultProps} isSavingEnabled={false} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(input).toBeDisabled();
  });
});
