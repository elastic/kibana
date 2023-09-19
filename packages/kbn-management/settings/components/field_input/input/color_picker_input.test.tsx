/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ColorPickerInput } from './color_picker_input';
import { wrap } from '../mocks';

const name = 'Some color field';
const id = 'some:color:field';

describe('ColorPickerInput', () => {
  const defaultProps = {
    id,
    name,
    ariaLabel: 'Test',
    onChange: jest.fn(),
    value: '#000000',
  };

  it('renders without errors', () => {
    const { container } = render(wrap(<ColorPickerInput {...defaultProps} />));
    expect(container).toBeInTheDocument();
  });

  it('renders the value prop', () => {
    const { getByRole } = render(wrap(<ColorPickerInput {...defaultProps} />));
    const input = getByRole('textbox');
    expect(input).toHaveValue('#000000');
  });

  it('calls the onChange prop when the value changes', () => {
    const { getByRole } = render(wrap(<ColorPickerInput {...defaultProps} />));
    const input = getByRole('textbox');
    const newValue = '#ffffff';
    fireEvent.change(input, { target: { value: newValue } });
    expect(defaultProps.onChange).toHaveBeenCalledWith({ value: newValue });
  });

  it('disables the input when isDisabled prop is true', () => {
    const { getByRole } = render(wrap(<ColorPickerInput {...defaultProps} isDisabled />));
    const input = getByRole('textbox');
    expect(input).toBeDisabled();
  });
});
