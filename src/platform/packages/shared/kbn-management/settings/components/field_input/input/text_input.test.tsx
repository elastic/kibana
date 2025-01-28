/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { TextInput, TextInputProps } from './text_input';
import { TEST_SUBJ_PREFIX_FIELD } from '.';

const name = 'Some text field';
const id = 'some:text:field';

describe('TextInput', () => {
  const onInputChange = jest.fn();
  const defaultProps: TextInputProps = {
    onInputChange,
    field: {
      name,
      type: 'string',
      ariaAttributes: {
        ariaLabel: name,
      },
      id,
      isOverridden: false,
      defaultValue: 'initial value',
    },
    isSavingEnabled: true,
  };

  beforeEach(() => {
    onInputChange.mockClear();
  });

  it('renders without errors', () => {
    const { container } = render(<TextInput {...defaultProps} />);
    expect(container).toBeInTheDocument();
  });

  it('renders the value prop', () => {
    const { getByTestId } = render(<TextInput {...defaultProps} />);
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(input).toHaveValue('initial value');
  });

  it('calls the onInputChange prop when the value changes', () => {
    const { getByTestId } = render(<TextInput {...defaultProps} />);
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    fireEvent.change(input, { target: { value: 'new value' } });
    expect(defaultProps.onInputChange).toHaveBeenCalledWith({
      type: 'string',
      unsavedValue: 'new value',
    });
  });

  it('disables the input when isDisabled prop is true', () => {
    const { getByTestId } = render(<TextInput {...defaultProps} isSavingEnabled={false} />);
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(input).toBeDisabled();
  });
});
