/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { mountWithIntl } from '@kbn/test/jest';

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
  EuiSpacer: jest.requireActual('@elastic/eui').EuiSpacer,
  EuiFlexItem: jest.requireActual('@elastic/eui').EuiFlexItem,
  EuiButtonEmpty: jest.requireActual('@elastic/eui').EuiButtonEmpty,
  EuiFormErrorText: jest.requireActual('@elastic/eui').EuiFormErrorText,
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
    defaultProps.validateAscendingOrder = true;
    defaultProps.showValidation = true;
    const comp = mountWithIntl(<NumberList {...defaultProps} />);

    expect(comp.find('EuiFormErrorText').length).toBe(1);
  });

  test('should show a duplicate error', () => {
    defaultProps.numberArray = [3, 1, 3];
    defaultProps.disallowDuplicates = true;
    defaultProps.showValidation = true;
    const comp = mountWithIntl(<NumberList {...defaultProps} />);

    expect(comp.find('EuiFormErrorText').length).toBeGreaterThan(0);
  });

  test('should show many duplicate errors', () => {
    defaultProps.numberArray = [3, 1, 3, 1, 3, 1, 3, 1];
    defaultProps.disallowDuplicates = true;
    defaultProps.showValidation = true;
    const comp = mountWithIntl(<NumberList {...defaultProps} />);

    expect(comp.find('EuiFormErrorText').length).toBe(6);
  });

  test('should set validity as true', () => {
    mountWithIntl(<NumberList {...defaultProps} />);

    expect(defaultProps.setValidity).lastCalledWith(true);
  });

  test('should set validity as false when the order is invalid', () => {
    defaultProps.numberArray = [3, 2];
    defaultProps.validateAscendingOrder = true;
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

    expect(comp.find(NumberRow).first().prop('disableDelete')).toEqual(true);
  });

  test('should change value', () => {
    const comp = shallow(<NumberList {...defaultProps} />);
    const row = comp.find(NumberRow).first();
    row.prop('onChange')({ id: row.prop('model').id, value: '3' });

    expect(defaultProps.onChange).lastCalledWith([3, 2]);
  });

  test('should call setTouched', () => {
    const comp = shallow(<NumberList {...defaultProps} />);
    comp.find(NumberRow).first().prop('onBlur')();

    expect(defaultProps.setTouched).toBeCalled();
  });
});
