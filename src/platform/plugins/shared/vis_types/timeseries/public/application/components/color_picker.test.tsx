/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ColorPicker, ColorPickerProps } from './color_picker';
import { fireEvent, render, screen } from '@testing-library/react';

describe('ColorPicker', () => {
  const onChange = jest.fn();
  const defaultProps: ColorPickerProps = {
    name: 'color',
    value: null,
    onChange,
    disableTrash: true,
  };

  const renderColorPicker = (props?: Partial<ColorPickerProps>) =>
    render(<ColorPicker {...defaultProps} {...props} />);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the EuiColorPicker', () => {
    renderColorPicker();
    expect(screen.getByTestId('tvbColorPicker')).toBeInTheDocument();
  });

  it('should not render the clear button', () => {
    renderColorPicker();
    expect(screen.queryByTestId('tvbColorPickerClear')).toBeNull();
  });

  it('should render incorrect value to the input text but not call onChange prop', () => {
    renderColorPicker({ value: '#68BC00' });
    fireEvent.click(screen.getByRole('button'));
    fireEvent.change(screen.getAllByTestId('euiColorPickerInput_top')[0], {
      target: { value: 'INVALID' },
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getAllByTestId('euiColorPickerInput_top')[0]).toHaveValue('INVALID');
  });
  it('should render correct value to the input text and call onChange prop', () => {
    renderColorPicker({ value: '#68BC00' });
    fireEvent.click(screen.getByRole('button'));
    fireEvent.change(screen.getAllByTestId('euiColorPickerInput_top')[0], {
      target: { value: '#FFF' },
    });
    expect(onChange).toHaveBeenCalled();
    expect(screen.getAllByTestId('euiColorPickerInput_top')[0]).toHaveValue('#FFF');
  });

  it('should render the correct aria label to the color swatch button', () => {
    renderColorPicker({ value: 'rgba(85,66,177,0.59)' });
    expect(
      screen.getByLabelText('Color picker (rgba(85,66,177,0.59)), not accessible')
    ).toBeInTheDocument();
  });

  it('should call clear function if the disableTrash prop is false', () => {
    const { container } = renderColorPicker({ disableTrash: false, value: 'rgba(85,66,177,1)' });
    fireEvent.click(screen.getByTestId('tvbColorPickerClear'));
    expect(onChange).toHaveBeenCalled();
    expect(container.querySelector('[data-euiicon-type="cross"]')).toBeInTheDocument();
  });

  it('should render the correct value to the input text if the prop value is hex', () => {
    renderColorPicker({ value: '#68BC00' });
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByTestId('euiColorPickerInput_top')[0]).toHaveValue('#68BC00');
  });

  it('should render the correct value to the input text if the prop value is rgba', () => {
    renderColorPicker({ value: 'rgba(85,66,177,1)' });
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByTestId('euiColorPickerInput_top')[0]).toHaveValue('85,66,177,1');
  });
});
