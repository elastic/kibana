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
import { act } from 'react-dom/test-utils';
import { CategoryAxisPanel, CategoryAxisPanelProps } from '../category_axis_panel';
import { Axis } from '../../../../types';
import { ScaleTypes, Positions, positions, AxisTypes } from '../../../../utils/collections';
import { LabelOptions } from '../label_options';

describe('CategoryAxisPanel component', () => {
  let setCategoryAxis: jest.Mock;
  let onPositionChanged: jest.Mock;
  let defaultProps: CategoryAxisPanelProps;
  let axis: Axis;

  beforeEach(() => {
    setCategoryAxis = jest.fn();
    onPositionChanged = jest.fn();
    axis = {
      id: 'CategoryAxis-1',
      type: AxisTypes.CATEGORY,
      position: Positions.BOTTOM,
      show: true,
      style: {},
      scale: {
        type: ScaleTypes.LINEAR,
      },
      labels: {
        show: true,
        filter: true,
        truncate: 100,
      },
      title: {},
    } as Axis;

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

  afterEach(() => {
    setCategoryAxis.mockClear();
    onPositionChanged.mockClear();
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<CategoryAxisPanel {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should show LabelOptions when axis.show is true', () => {
    const comp = shallow(<CategoryAxisPanel {...defaultProps} />);

    expect(comp.find(LabelOptions).exists()).toBeTruthy();
  });

  it('should hide LabelOptions when axis.show is false', () => {
    axis.show = false;
    const comp = shallow(<CategoryAxisPanel {...defaultProps} />);

    expect(comp.find(LabelOptions).exists()).toBeFalsy();
  });

  it('should call onPositionChanged when position is changed', () => {
    const value = Positions.RIGHT;
    const comp = shallow(<CategoryAxisPanel {...defaultProps} />);
    act(() => {
      comp.find({ paramName: 'position' }).prop('setValue')('position', value);
    });

    expect(setCategoryAxis).toBeCalledWith({ ...axis, position: value });
    expect(onPositionChanged).toBeCalledWith(value);
  });
});
