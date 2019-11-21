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
import { shallow } from 'enzyme';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { NumberList, NumberListProps } from './number_list';
import { NumberRow } from './number_row';

jest.mock('./number_row', () => ({
  NumberRow: () => 'NumberRow',
}));

jest.mock('@elastic/eui', () => ({
  htmlIdGenerator: jest.fn(() => {
    let counter = 1;
    return () => `12${counter++}`;
  }),
  EuiSpacer: require.requireActual('@elastic/eui').EuiSpacer,
  EuiFlexItem: require.requireActual('@elastic/eui').EuiFlexItem,
  EuiButtonEmpty: require.requireActual('@elastic/eui').EuiButtonEmpty,
  EuiFormErrorText: require.requireActual('@elastic/eui').EuiFormErrorText,
}));

describe('NumberList', () => {
  let defaultProps: NumberListProps;

  beforeEach(() => {
    defaultProps = {
      labelledbyId: 'numberList',
      numberArray: [1, 2],
      range: '[1, 10]',
      showValidation: false,
      unitName: 'value',
      onChange: jest.fn(),
      setTouched: jest.fn(),
      setValidity: jest.fn(),
    };
  });

  test('should be rendered with default set of props', () => {
    const comp = shallow(<NumberList {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  test('should show an order error', () => {
    defaultProps.numberArray = [3, 1];
    defaultProps.showValidation = true;
    const comp = mountWithIntl(<NumberList {...defaultProps} />);

    expect(comp.find('EuiFormErrorText').length).toBe(1);
  });

  test('should set validity as true', () => {
    mountWithIntl(<NumberList {...defaultProps} />);

    expect(defaultProps.setValidity).lastCalledWith(true);
  });

  test('should set validity as false when the order is invalid', () => {
    defaultProps.numberArray = [3, 2];
    const comp = mountWithIntl(<NumberList {...defaultProps} />);

    expect(defaultProps.setValidity).lastCalledWith(false);

    comp.setProps({ numberArray: [1, 2] });
    expect(defaultProps.setValidity).lastCalledWith(true);
  });

  test('should set validity as false when there is an empty field', () => {
    defaultProps.numberArray = [1, 2];
    const comp = mountWithIntl(<NumberList {...defaultProps} />);

    comp.setProps({ numberArray: [1, undefined] });
    expect(defaultProps.setValidity).lastCalledWith(false);
  });

  test('should set 0 when number array is empty', () => {
    defaultProps.numberArray = [];
    mountWithIntl(<NumberList {...defaultProps} />);

    expect(defaultProps.onChange).lastCalledWith([0]);
  });

  test('should add a number', () => {
    const comp = shallow(<NumberList {...defaultProps} />);
    comp.find('EuiButtonEmpty').simulate('click');

    expect(defaultProps.onChange).lastCalledWith([1, 2, 3]);
  });

  test('should remove a number', () => {
    const comp = shallow(<NumberList {...defaultProps} />);
    const row = comp.find(NumberRow).first();
    row.prop('onDelete')(row.prop('model').id);

    expect(defaultProps.onChange).lastCalledWith([2]);
  });

  test('should disable remove button if there is one number', () => {
    defaultProps.numberArray = [1];
    const comp = shallow(<NumberList {...defaultProps} />);

    expect(
      comp
        .find(NumberRow)
        .first()
        .prop('disableDelete')
    ).toEqual(true);
  });

  test('should change value', () => {
    const comp = shallow(<NumberList {...defaultProps} />);
    const row = comp.find(NumberRow).first();
    row.prop('onChange')({ id: row.prop('model').id, value: '3' });

    expect(defaultProps.onChange).lastCalledWith([3, 2]);
  });

  test('should call setTouched', () => {
    const comp = shallow(<NumberList {...defaultProps} />);
    comp
      .find(NumberRow)
      .first()
      .prop('onBlur')();

    expect(defaultProps.setTouched).toBeCalled();
  });
});
