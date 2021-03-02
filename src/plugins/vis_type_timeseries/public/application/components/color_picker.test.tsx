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
import type { PersistedState } from '../../../../visualizations/public';

describe('ColorPicker', () => {
  const defaultProps: ColorPickerProps = {
    name: 'color',
    value: null,
    onChange: jest.fn(),
    disableTrash: true,
  };
  let component: ReactWrapper<ColorPickerProps>;
  const mockState = new Map();
  const uiState = ({
    get: jest
      .fn()
      .mockImplementation((key, fallback) => (mockState.has(key) ? mockState.get(key) : fallback)),
    set: jest.fn().mockImplementation((key, value) => mockState.set(key, value)),
    emit: jest.fn(),
    setSilent: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  } as unknown) as PersistedState;

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

  it('renders correctly the color picker if the isOnLegend prop is true', () => {
    const props = { ...defaultProps, isOnLegend: true, value: 'rgba(85,66,177,1)' };
    component = mount(<ColorPicker {...props} />);
    expect(component.find(EuiColorPicker).prop('display')).toBe('inline');
    expect(component.find(EuiColorPicker).prop('button')).toBeUndefined();
  });

  it('renders the correct color if is overwritten by the user', () => {
    uiState.set('vis.colors', [
      {
        id: '61ca57f1-469d-11e7-af02-69e470af7417',
        overwrite: {
          Count: '#4CE7A6',
        },
      },
      {
        id: '61ca57f1-469d-11e7-af02-69e470af7417:JetBeats',
        overwrite: {
          JetBeats: '#6092C0',
        },
      },
    ]);
    const props = {
      ...defaultProps,
      uiState,
      value: 'rgba(85,66,177,1)',
      seriesName: 'JetBeats',
      seriesId: '61ca57f1-469d-11e7-af02-69e470af7417:JetBeats',
    };
    component = mount(<ColorPicker {...props} />);
    expect(component.find(EuiColorPicker).prop('color')).toBe('#6092C0');
    component.find('.tvbColorPicker button').simulate('click');
    const input = findTestSubject(component, 'topColorPickerInput');
    expect(input.props().value).toBe('#6092C0');
  });

  it('renders the clear color button if isOnLegend prop is true and user has overwritten the series color', () => {
    const props = {
      ...defaultProps,
      uiState,
      value: 'rgba(85,66,177,1)',
      seriesName: 'JetBeats',
      seriesId: '61ca57f1-469d-11e7-af02-69e470af7417:JetBeats',
      isOnLegend: true,
    };
    component = mount(<ColorPicker {...props} />);
    expect(findTestSubject(component, 'tvbColorPickerClearColor').length).toBe(1);
  });
});
