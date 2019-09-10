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
import { ColorPicker } from './color_picker';
import { mount } from 'enzyme';
import { CustomColorPicker } from './custom_color_picker';

const defaultProps = {
  name: 'color',
  value: null,
  onChange: jest.fn(),
  disableTrash: true,
};

describe('ColorPicker', () => {
  it('should change state after click', () => {
    const wrapper = mount(<ColorPicker {...defaultProps} />);

    const stateBefore = wrapper.state();
    wrapper
      .find('button')
      .at(0)
      .simulate('click');
    const stateAfter = wrapper.state();

    expect(stateBefore.displayPicker).toBe(!stateAfter.displayPicker);
  });

  it('should close popup after click', () => {
    const wrapper = mount(<ColorPicker {...defaultProps} />);
    wrapper.setState({ displayPicker: true });

    wrapper.find('.tvbColorPicker__cover').simulate('click');

    expect(wrapper.state().displayPicker).toBeFalsy();
  });

  it('should exist CustomColorPickerUI component', () => {
    const wrapper = mount(<ColorPicker {...defaultProps} />);
    wrapper.setState({ displayPicker: true });

    const w2 = wrapper.find(CustomColorPicker).exists();

    expect(w2).toBeTruthy();
  });

  it('should call clear function', () => {
    const props = { ...defaultProps, disableTrash: false, value: 'rgba(85,66,177,1)' };
    const wrapper = mount(<ColorPicker {...props} />);

    wrapper.find('.tvbColorPicker__clear').simulate('click');

    expect(defaultProps.onChange).toHaveBeenCalled();
  });
});
