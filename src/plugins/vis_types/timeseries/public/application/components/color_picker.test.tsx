/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ColorPicker, ColorPickerProps } from './color_picker';
import { mount } from 'enzyme';
import { ReactWrapper } from 'enzyme';
import { EuiColorPicker, EuiIconTip } from '@elastic/eui';
import { findTestSubject } from '@elastic/eui/lib/test';

describe('ColorPicker', () => {
  const defaultProps: ColorPickerProps = {
    name: 'color',
    value: null,
    onChange: jest.fn(),
    disableTrash: true,
  };
  let component: ReactWrapper<ColorPickerProps>;

  it('should render the EuiColorPicker', () => {
    component = mount(<ColorPicker {...defaultProps} />);
    expect(component.find(EuiColorPicker).length).toBe(1);
  });

  it('should not render the clear button', () => {
    component = mount(<ColorPicker {...defaultProps} />);
    expect(findTestSubject(component, 'tvbColorPickerClear').length).toBe(0);
  });

  it('should render the correct value to the input text if the prop value is hex', () => {
    const props = { ...defaultProps, value: '#68BC00' };
    component = mount(<ColorPicker {...props} />);
    findTestSubject(component, 'tvbColorPicker').find('button').simulate('click');
    const input = findTestSubject(component, 'euiColorPickerInput_top');
    expect(input.props().value).toBe('#68BC00');
  });

  it('should render the correct value to the input text if the prop value is rgba', () => {
    const props = { ...defaultProps, value: 'rgba(85,66,177,1)' };
    component = mount(<ColorPicker {...props} />);
    findTestSubject(component, 'tvbColorPicker').find('button').simulate('click');
    const input = findTestSubject(component, 'euiColorPickerInput_top');
    expect(input.props().value).toBe('85,66,177,1');
  });

  it('should render the correct aria label to the color swatch button', () => {
    const props = { ...defaultProps, value: 'rgba(85,66,177,0.59)' };
    component = mount(<ColorPicker {...props} />);
    const button = findTestSubject(component, 'tvbColorPicker').find('button');
    expect(button.prop('aria-label')).toBe('Color picker (rgba(85,66,177,0.59)), not accessible');
  });

  it('should call clear function if the disableTrash prop is false', () => {
    const props = { ...defaultProps, disableTrash: false, value: 'rgba(85,66,177,1)' };
    component = mount(<ColorPicker {...props} />);

    findTestSubject(component, 'tvbColorPickerClear').simulate('click');

    expect(component.find(EuiIconTip).length).toBe(1);
    expect(defaultProps.onChange).toHaveBeenCalled();
  });
});
