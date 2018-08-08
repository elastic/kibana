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
import { render, mount } from 'enzyme';
import sinon from 'sinon';

import {
  KuiColorPicker,
} from './color_picker';
import { requiredProps } from '../../test/required_props';

let onChange;

beforeEach(() => {
  onChange = sinon.spy();

  // There's a `console.error` within `react-color`, so we're just "hiding it"
  sinon.stub(console, 'error');
});

afterEach(() => {
  console.error.restore();
});

test('renders KuiColorPicker', () => {
  const colorPicker = render(
    <KuiColorPicker
      onChange={onChange}
      color="#ffeedd"
      {...requiredProps}
    />
  );
  expect(colorPicker).toMatchSnapshot();
});

test('renders KuiColorPicker with an empty swatch when color is null', () => {
  const colorPicker = render(
    <KuiColorPicker
      onChange={onChange}
      color={null}
      {...requiredProps}
    />
  );
  expect(colorPicker).toMatchSnapshot();
});

test('renders KuiColorPicker without a color label when showColorLabel is false', () => {
  const colorPicker = render(
    <KuiColorPicker
      onChange={onChange}
      color={'#ffffff'}
      showColorLabel={false}
      {...requiredProps}
    />
  );
  expect(colorPicker).toMatchSnapshot();
});

test('pop up color selector is not shown by default', () => {
  const colorPicker = mount(
    <KuiColorPicker
      onChange={onChange}
      color="#ffeedd"
      {...requiredProps}
    />
  );

  const colorSelector = colorPicker.find('[data-test-subj="colorPickerPopup"]');
  expect(colorSelector.length).toBe(0);
});

test('pop up color selector is shown when the color swatch is clicked', () => {
  const colorPicker = mount(
    <KuiColorPicker
      onChange={onChange}
      color="#ffeedd"
      {...requiredProps}
    />
  );

  colorPicker.find('[data-test-subj="colorSwatch"]').simulate('click');
  const colorSelector = colorPicker.find('[data-test-subj="colorPickerPopup"]');
  expect(colorSelector.length).toBe(1);
});

test('pop up color selector is hidden when the color swatch is clicked twice', () => {
  const colorPicker = mount(
    <KuiColorPicker
      onChange={onChange}
      color="#ffeedd"
      {...requiredProps}
    />
  );

  colorPicker.find('[data-test-subj="colorSwatch"]').simulate('click');
  colorPicker.find('[data-test-subj="colorSwatch"]').simulate('click');
  const colorSelector = colorPicker.find('[data-test-subj="colorPickerPopup"]');
  expect(colorSelector.length).toBe(0);
});

test('Setting a new color calls onChange', () => {
  const colorPicker = mount(
    <KuiColorPicker
      onChange={onChange}
      color="#ffeedd"
      {...requiredProps}
    />
  );

  colorPicker.find('[data-test-subj="colorSwatch"]').simulate('click');
  const event = { target: { value: '#000000' } };
  const inputs = colorPicker.find('input');
  expect(inputs.length).toBe(1);
  inputs.simulate('change', event);
  sinon.assert.calledOnce(onChange);
  sinon.assert.calledWith(onChange, '#000000');
});
