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
import { LegendColorPickerProps } from '@elastic/charts';
import { EuiWrappingPopover } from '@elastic/eui';
import { mount } from 'enzyme';
import { ComponentType, ReactWrapper } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
import { getColorPicker } from './get_color_picker';
import { ColorPicker } from '../temp';
import { createMockBucketColumns, createMockVisData } from '../mocks';

const bucketColumns = createMockBucketColumns();
const visData = createMockVisData();

jest.mock('@elastic/charts', () => {
  const original = jest.requireActual('@elastic/charts');

  return {
    ...original,
    getSpecId: jest.fn(() => {}),
  };
});

describe('getColorPicker', function () {
  let wrapperProps: LegendColorPickerProps;
  const Component: ComponentType<LegendColorPickerProps> = getColorPicker(
    'left',
    jest.fn(),
    bucketColumns,
    'default',
    visData.rows
  );
  let wrapper: ReactWrapper<LegendColorPickerProps>;

  beforeAll(() => {
    wrapperProps = {
      color: 'rgb(109, 204, 177)',
      onClose: jest.fn(),
      onChange: jest.fn(),
      anchor: document.createElement('div'),
      seriesIdentifier: {
        key: 'Logstash Airways',
        specId: 'pie',
      },
    };
  });

  it('renders the color picker for default palette and inner layer', () => {
    wrapper = mount(<Component {...wrapperProps} />);
    expect(findTestSubject(wrapper, 'visColorPicker').length).toBe(1);
  });

  it('renders the picker on the correct position', () => {
    wrapper = mount(<Component {...wrapperProps} />);
    expect(wrapper.find(EuiWrappingPopover).prop('anchorPosition')).toEqual('rightCenter');
  });

  it('converts the color to the right hex and passes it to the color picker', () => {
    wrapper = mount(<Component {...wrapperProps} />);
    expect(wrapper.find(ColorPicker).prop('color')).toEqual('#6DCCB1');
  });

  it('doesnt render the picker for default palette and not inner layer', () => {
    const newProps = { ...wrapperProps, seriesIdentifier: { key: '1', specId: 'pie' } };
    wrapper = mount(<Component {...newProps} />);
    expect(wrapper).toEqual({});
  });

  it('renders the picker for kibana palette and not inner layer', () => {
    const LegacyPaletteComponent: ComponentType<LegendColorPickerProps> = getColorPicker(
      'left',
      jest.fn(),
      bucketColumns,
      'kibana_palette',
      visData.rows
    );
    const newProps = { ...wrapperProps, seriesIdentifier: { key: '1', specId: 'pie' } };
    wrapper = mount(<LegacyPaletteComponent {...newProps} />);
    expect(findTestSubject(wrapper, 'visColorPicker').length).toBe(1);
  });
});
