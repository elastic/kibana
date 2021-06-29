/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { AddFilter } from './add_filter';

describe('AddFilter', () => {
  test('should render normally', () => {
    const component = shallow(<AddFilter onAddFilter={() => {}} />);

    expect(component).toMatchSnapshot();
  });

  test('should allow adding a filter', async () => {
    const onAddFilter = jest.fn();
    const component = shallow(<AddFilter onAddFilter={onAddFilter} />);

    component.find('EuiFieldText').simulate('change', { target: { value: 'tim*' } });
    component.find('EuiButton').simulate('click');
    component.update();

    expect(onAddFilter).toBeCalledWith('tim*');
  });

  test('should ignore strings with just spaces', () => {
    const component = shallow(<AddFilter onAddFilter={() => {}} />);

    // Set a value in the input field
    component.find('EuiFieldText').simulate('keypress', ' ');
    component.update();

    expect(component).toMatchSnapshot();
  });
});
