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
    comp.find('EuiFieldNumber').prop('onChange')!({ target: { value: '5' } } as React.ChangeEvent<
      HTMLInputElement
    >);

    expect(defaultProps.onChange).lastCalledWith({ id: defaultProps.model.id, value: '5' });
  });
});
