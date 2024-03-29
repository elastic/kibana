/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { MultiValueRow } from './multi_value_row';
import { ColorPicker } from '../../color_picker';

describe('MultiValueRow', () => {
  const model = {
    id: 95,
    value: '95',
    color: '#00028',
  };
  const props = {
    model,
    enableColorPicker: true,
    onChange: jest.fn(),
    onDelete: jest.fn(),
    onAdd: jest.fn(),
    disableAdd: false,
    disableDelete: false,
  };

  const wrapper = shallowWithIntl(<MultiValueRow {...props} />);

  it('displays a color picker if the enableColorPicker prop is true', () => {
    expect(wrapper.find(ColorPicker).length).toEqual(1);
  });

  it('not displays a color picker if the enableColorPicker prop is false', () => {
    const newWrapper = shallowWithIntl(<MultiValueRow {...props} enableColorPicker={false} />);
    expect(newWrapper.find(ColorPicker).length).toEqual(0);
  });

  it('sets the picker color to the model color', () => {
    expect(wrapper.find(ColorPicker).prop('value')).toEqual('#00028');
  });

  it('should have called the onChange function on color change', () => {
    wrapper.find(ColorPicker).simulate('change');
    expect(props.onChange).toHaveBeenCalled();
  });
});
