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
import { mountWithIntl } from '@kbn/test/jest';
import { ComponentType, ReactWrapper } from 'enzyme';
import { getColorPicker } from './get_color_picker';
import { ColorPicker } from '../../../../charts/public';
import type { PersistedState } from '../../../../visualizations/public';
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
  const mockState = new Map();
  const uiState = {
    get: jest
      .fn()
      .mockImplementation((key, fallback) => (mockState.has(key) ? mockState.get(key) : fallback)),
    set: jest.fn().mockImplementation((key, value) => mockState.set(key, value)),
    emit: jest.fn(),
    setSilent: jest.fn(),
  } as unknown as PersistedState;

  let wrapperProps: LegendColorPickerProps;
  const Component: ComponentType<LegendColorPickerProps> = getColorPicker(
    'left',
    jest.fn(),
    bucketColumns,
    'default',
    visData.rows,
    uiState,
    false
  );
  let wrapper: ReactWrapper<LegendColorPickerProps>;

  beforeAll(() => {
    wrapperProps = {
      color: 'rgb(109, 204, 177)',
      onClose: jest.fn(),
      onChange: jest.fn(),
      anchor: document.createElement('div'),
      seriesIdentifiers: [
        {
          key: 'Logstash Airways',
          specId: 'pie',
        },
      ],
    };
  });

  it('renders the color picker for default palette and inner layer', () => {
    wrapper = mountWithIntl(<Component {...wrapperProps} />);
    expect(wrapper.find(ColorPicker).length).toBe(1);
  });

  it('renders the picker on the correct position', () => {
    wrapper = mountWithIntl(<Component {...wrapperProps} />);
    expect(wrapper.find(EuiPopover).prop('anchorPosition')).toEqual('rightCenter');
  });

  it('converts the color to the right hex and passes it to the color picker', () => {
    wrapper = mountWithIntl(<Component {...wrapperProps} />);
    expect(wrapper.find(ColorPicker).prop('color')).toEqual('#6dccb1');
  });

  it('doesnt render the picker for default palette and not inner layer', () => {
    const newProps = { ...wrapperProps, seriesIdentifier: { key: '1', specId: 'pie' } };
    wrapper = mountWithIntl(<Component {...newProps} />);
    expect(wrapper).toEqual({});
  });

  it('renders the color picker with the colorIsOverwritten prop set to false if color is not overwritten for the specific series', () => {
    wrapper = mountWithIntl(<Component {...wrapperProps} />);
    expect(wrapper.find(ColorPicker).prop('colorIsOverwritten')).toBe(false);
  });

  it('renders the color picker with the colorIsOverwritten prop set to true if color is overwritten for the specific series', () => {
    uiState.set('vis.colors', { 'Logstash Airways': '#6092c0' });
    wrapper = mountWithIntl(<Component {...wrapperProps} />);
    expect(wrapper.find(ColorPicker).prop('colorIsOverwritten')).toBe(true);
  });

  it('renders the picker for kibana palette and not distinctColors', () => {
    const LegacyPaletteComponent: ComponentType<LegendColorPickerProps> = getColorPicker(
      'left',
      jest.fn(),
      bucketColumns,
      'kibana_palette',
      visData.rows,
      uiState,
      true
    );
    const newProps = { ...wrapperProps, seriesIdentifier: { key: '1', specId: 'pie' } };
    wrapper = mountWithIntl(<LegacyPaletteComponent {...newProps} />);
    expect(wrapper.find(ColorPicker).length).toBe(1);
    expect(wrapper.find(ColorPicker).prop('useLegacyColors')).toBe(true);
  });
});
