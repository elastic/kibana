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
import { shallow, mount } from 'enzyme';
import { CustomExtentsOptions, CustomExtentsOptionsProps } from './custom_extents_options';
import { YExtents } from './y_extents';
import { valueAxis } from './mocks';

const BOUNDS_MARGIN = 'boundsMargin';
const DEFAULT_Y_EXTENTS = 'defaultYExtents';
const SCALE = 'scale';
const SET_Y_EXTENTS = 'setYExtents';

jest.mock('ui/new_platform');

describe('CustomExtentsOptions component', () => {
  let setValueAxis: jest.Mock;
  let setValueAxisScale: jest.Mock;
  let setMultipleValidity: jest.Mock;
  let defaultProps: CustomExtentsOptionsProps;

  beforeEach(() => {
    setValueAxis = jest.fn();
    setValueAxisScale = jest.fn();
    setMultipleValidity = jest.fn();

    defaultProps = {
      axis: { ...valueAxis },
      setValueAxis,
      setValueAxisScale,
      setMultipleValidity,
    };
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<CustomExtentsOptions {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  describe('boundsMargin', () => {
    it('should set validity as true when value is positive', () => {
      defaultProps.axis.scale.boundsMargin = 5;
      mount(<CustomExtentsOptions {...defaultProps} />);

      expect(setMultipleValidity).toBeCalledWith(BOUNDS_MARGIN, true);
    });

    it('should set validity as true when value is empty', () => {
      const comp = mount(<CustomExtentsOptions {...defaultProps} />);
      comp.setProps({
        axis: { ...valueAxis, scale: { ...valueAxis.scale, boundsMargin: undefined } },
      });

      expect(setMultipleValidity).toBeCalledWith(BOUNDS_MARGIN, true);
    });

    it('should set validity as false when value is negative', () => {
      defaultProps.axis.scale.defaultYExtents = true;
      const comp = mount(<CustomExtentsOptions {...defaultProps} />);
      comp.setProps({
        axis: { ...valueAxis, scale: { ...valueAxis.scale, boundsMargin: -1 } },
      });

      expect(setMultipleValidity).toBeCalledWith(BOUNDS_MARGIN, false);
    });
  });

  describe('defaultYExtents', () => {
    it('should show bounds margin input when defaultYExtents is true', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);

      expect(comp.find({ paramName: BOUNDS_MARGIN }).exists()).toBeTruthy();
    });

    it('should hide bounds margin input when defaultYExtents is false', () => {
      defaultProps.axis.scale = { ...defaultProps.axis.scale, defaultYExtents: false };
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);

      expect(comp.find({ paramName: BOUNDS_MARGIN }).exists()).toBeFalsy();
    });

    it('should call setValueAxis when value is true', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      comp.find({ paramName: DEFAULT_Y_EXTENTS }).prop('setValue')(DEFAULT_Y_EXTENTS, true);

      expect(setMultipleValidity).not.toBeCalled();
      expect(setValueAxis).toBeCalledWith(SCALE, defaultProps.axis.scale);
    });

    it('should reset boundsMargin when value is false', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      comp.find({ paramName: DEFAULT_Y_EXTENTS }).prop('setValue')(DEFAULT_Y_EXTENTS, false);

      const newScale = {
        ...defaultProps.axis.scale,
        boundsMargin: undefined,
        defaultYExtents: false,
      };
      expect(setValueAxis).toBeCalledWith(SCALE, newScale);
    });
  });

  describe('setYExtents', () => {
    it('should show YExtents when value is true', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);

      expect(comp.find(YExtents).exists()).toBeTruthy();
    });

    it('should hide YExtents when value is false', () => {
      defaultProps.axis.scale = { ...defaultProps.axis.scale, setYExtents: false };
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);

      expect(comp.find(YExtents).exists()).toBeFalsy();
    });

    it('should call setValueAxis when value is true', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      comp.find({ paramName: SET_Y_EXTENTS }).prop('setValue')(SET_Y_EXTENTS, true);

      expect(setValueAxis).toBeCalledWith(SCALE, defaultProps.axis.scale);
    });

    it('should reset min and max when value is false', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      comp.find({ paramName: SET_Y_EXTENTS }).prop('setValue')(SET_Y_EXTENTS, false);

      const newScale = {
        ...defaultProps.axis.scale,
        min: undefined,
        max: undefined,
        setYExtents: false,
      };
      expect(setValueAxis).toBeCalledWith(SCALE, newScale);
    });
  });
});
