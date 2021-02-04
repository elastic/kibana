/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { LegendColorPickerProps } from '@elastic/charts';
import { EuiPopover } from '@elastic/eui';
import { mount } from 'enzyme';
import { ComponentType, ReactWrapper } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
import { getColorPicker } from './get_color_picker';
import { ColorPicker } from '../../../charts/public';
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
    expect(wrapper.find(EuiPopover).prop('anchorPosition')).toEqual('rightCenter');
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
