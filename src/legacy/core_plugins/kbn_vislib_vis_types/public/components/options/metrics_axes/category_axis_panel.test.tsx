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
import { CategoryAxisPanel, CategoryAxisPanelProps } from './category_axis_panel';
import { Axis } from '../../../types';
import { Positions, getPositions } from '../../../utils/collections';
import { LabelOptions } from './label_options';
import { categoryAxis } from './mocks';

jest.mock('ui/new_platform');

const positions = getPositions();

describe('CategoryAxisPanel component', () => {
  let setCategoryAxis: jest.Mock;
  let onPositionChanged: jest.Mock;
  let defaultProps: CategoryAxisPanelProps;
  let axis: Axis;

  beforeEach(() => {
    setCategoryAxis = jest.fn();
    onPositionChanged = jest.fn();
    axis = categoryAxis;

    defaultProps = {
      axis,
      vis: {
        type: {
          editorConfig: {
            collections: { positions },
          },
        },
      },
      onPositionChanged,
      setCategoryAxis,
    } as any;
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
    const value = Positions.RIGHT;
    const comp = shallow(<CategoryAxisPanel {...defaultProps} />);
    comp.find({ paramName: 'position' }).prop('setValue')('position', value);

    expect(setCategoryAxis).toHaveBeenLastCalledWith({ ...axis, position: value });
    expect(onPositionChanged).toBeCalledWith(value);
  });
});
