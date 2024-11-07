/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallow } from 'enzyme';

import { NumberRow, NumberRowProps } from './number_row';

describe('NumberRow', () => {
  let defaultProps: NumberRowProps;

  beforeEach(() => {
    defaultProps = {
      autoFocus: false,
      disableDelete: false,
      isInvalid: false,
      labelledbyId: 'numberList',
      model: { value: 1, id: '1', isInvalid: false },
      range: {
        min: 1,
        max: 10,
        minInclusive: true,
        maxInclusive: true,
        within: jest.fn(() => true),
      },
      onChange: jest.fn(),
      onBlur: jest.fn(),
      onDelete: jest.fn(),
    };
  });

  test('should be rendered with default set of props', () => {
    const comp = shallow(<NumberRow {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  test('should call onDelete', () => {
    const comp = shallow(<NumberRow {...defaultProps} />);
    comp.find('EuiButtonIcon').simulate('click');

    expect(defaultProps.onDelete).lastCalledWith(defaultProps.model.id);
  });

  test('should call onChange', () => {
    const comp = shallow(<NumberRow {...defaultProps} />);
    comp.find('EuiFieldNumber').prop('onChange')!({
      target: { value: '5' },
    } as React.ChangeEvent<HTMLInputElement>);

    expect(defaultProps.onChange).lastCalledWith({ id: defaultProps.model.id, value: '5' });
  });
});
