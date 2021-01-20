/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { CategoryAxisPanel, CategoryAxisPanelProps } from './category_axis_panel';
import { CategoryAxis } from '../../../../types';
import { LabelOptions } from './label_options';
import { categoryAxis, vis } from './mocks';
import { Position } from '@elastic/charts';

describe('CategoryAxisPanel component', () => {
  let setCategoryAxis: jest.Mock;
  let onPositionChanged: jest.Mock;
  let defaultProps: CategoryAxisPanelProps;
  let axis: CategoryAxis;

  beforeEach(() => {
    setCategoryAxis = jest.fn();
    onPositionChanged = jest.fn();
    axis = categoryAxis;

    defaultProps = {
      axis,
      vis,
      onPositionChanged,
      setCategoryAxis,
    };
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<CategoryAxisPanel {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should respond axis.show', () => {
    const comp = shallow(<CategoryAxisPanel {...defaultProps} />);

    expect(comp.find(LabelOptions).exists()).toBeTruthy();

    comp.setProps({ axis: { ...axis, show: false } });
    expect(comp.find(LabelOptions).exists()).toBeFalsy();
  });

  it('should call onPositionChanged when position is changed', () => {
    const value = Position.Right;
    const comp = shallow(<CategoryAxisPanel {...defaultProps} />);
    comp.find({ paramName: 'position' }).prop('setValue')('position', value);

    expect(setCategoryAxis).toHaveBeenLastCalledWith({ ...axis, position: value });
    expect(onPositionChanged).toBeCalledWith(value);
  });
});
