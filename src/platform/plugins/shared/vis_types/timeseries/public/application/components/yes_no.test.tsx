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
import { YesNo } from './yes_no';

describe('YesNo', () => {
  it('call onChange={handleChange} on yes', () => {
    const handleChange = jest.fn();
    const wrapper = shallow(
      <YesNo name="ignore_global_filters" onChange={handleChange} value={0} />
    );
    wrapper.find('EuiRadio').first().simulate('change');
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith({
      ignore_global_filters: 1,
    });
  });

  it('call onChange={handleChange} on no', () => {
    const handleChange = jest.fn();
    const wrapper = shallow(<YesNo name="show_legend" onChange={handleChange} value={1} />);
    wrapper.find('EuiRadio').last().simulate('change');
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith({
      show_legend: 0,
    });
  });
});
