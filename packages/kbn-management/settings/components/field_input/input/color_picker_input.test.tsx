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
import { ColorPickerInput, ColorPickerInputProps } from './color_picker_input';
import { wrap } from '../mocks';

const name = 'Some color field';
const id = 'some:color:field';

describe('ColorPickerInput', () => {
  const onInputChange = jest.fn();
  const defaultProps: ColorPickerInputProps = {
    onInputChange,
    field: {
      name,
      type: 'color',
      ariaAttributes: {
        ariaLabel: name,
      },
      id,
      isOverridden: false,
      defaultValue: '#000000',
    },
    isSavingEnabled: true,
  };

  beforeEach(() => {
    onInputChange.mockClear();
  });

  it('renders without errors', () => {
    const { container, getByRole } = render(wrap(<ColorPickerInput {...defaultProps} />));
    expect(container).toBeInTheDocument();
    const input = getByRole('textbox');
    expect(input).toHaveValue('#000000');
  });

  it('calls the onInputChange prop when the value changes', () => {
    const { getByRole } = render(wrap(<ColorPickerInput {...defaultProps} />));
    const input = getByRole('textbox');
    const newValue = '#ffffff';
    fireEvent.change(input, { target: { value: newValue } });
    expect(defaultProps.onInputChange).toHaveBeenCalledWith({
      type: 'color',
      unsavedValue: newValue,
    });
  });

  it('calls the onInputChange prop with an error when the value is malformed', () => {
    const { getByRole } = render(wrap(<ColorPickerInput {...defaultProps} />));
    const input = getByRole('textbox');
    const newValue = '#1234';
    fireEvent.change(input, { target: { value: newValue } });
    expect(defaultProps.onInputChange).toHaveBeenCalledWith({
      type: 'color',
      unsavedValue: newValue,
      isInvalid: true,
      error: 'Provide a valid color value',
    });
  });

  it('disables the input when isDisabled prop is true', () => {
    const { getByRole } = render(
      wrap(<ColorPickerInput {...defaultProps} isSavingEnabled={false} />)
    );
    const input = getByRole('textbox');
    expect(input).toBeDisabled();
  });
});
