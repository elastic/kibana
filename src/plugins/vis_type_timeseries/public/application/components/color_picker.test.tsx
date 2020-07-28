/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { ColorPicker, ColorPickerProps } from './color_picker';
import { mount } from 'enzyme';
import { ReactWrapper } from 'enzyme';
import { EuiColorPicker, EuiIconTip } from '@elastic/eui';
// @ts-ignore
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
    expect(component.find('.tvbColorPicker__clear').length).toBe(0);
  });

  it('should render the correct value to the input text if the prop value is hex', () => {
    const props = { ...defaultProps, value: '#68BC00' };
    component = mount(<ColorPicker {...props} />);
    component.find('.tvbColorPicker button').simulate('click');
    const input = findTestSubject(component, 'topColorPickerInput');
    expect(input.props().value).toBe('#68BC00');
  });

  it('should render the correct value to the input text if the prop value is rgba', () => {
    const props = { ...defaultProps, value: 'rgba(85,66,177,1)' };
    component = mount(<ColorPicker {...props} />);
    component.find('.tvbColorPicker button').simulate('click');
    const input = findTestSubject(component, 'topColorPickerInput');
    expect(input.props().value).toBe('85,66,177,1');
  });

  it('should render the correct aria label to the color swatch button', () => {
    const props = { ...defaultProps, value: 'rgba(85,66,177,0.59)' };
    component = mount(<ColorPicker {...props} />);
    const button = component.find('.tvbColorPicker button');
    expect(button.prop('aria-label')).toBe('Color picker (rgba(85,66,177,0.59)), not accessible');
  });

  it('should call clear function if the disableTrash prop is false', () => {
    const props = { ...defaultProps, disableTrash: false, value: 'rgba(85,66,177,1)' };
    component = mount(<ColorPicker {...props} />);

    component.find('.tvbColorPicker__clear').simulate('click');

    expect(component.find(EuiIconTip).length).toBe(1);
    expect(defaultProps.onChange).toHaveBeenCalled();
  });
});
