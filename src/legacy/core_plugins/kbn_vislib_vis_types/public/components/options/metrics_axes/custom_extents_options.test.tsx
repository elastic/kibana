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
import { CustomExtentsOptions, CustomExtentsOptionsProps } from './custom_extents_options';
import { Axis } from '../../../types';
import { YExtents } from './y_extents';

describe('CustomExtentsOptions component', () => {
  let setValueAxis: jest.Mock;
  let setValueAxisScale: jest.Mock;
  let setMultipleValidity: jest.Mock;
  let defaultProps: CustomExtentsOptionsProps;
  const axis = {
    scale: {
      defaultYExtents: true,
      boundsMargin: undefined,
      setYExtents: true,
      min: undefined,
      max: undefined,
    },
  } as Axis;

  beforeEach(() => {
    setValueAxis = jest.fn();
    setValueAxisScale = jest.fn();
    setMultipleValidity = jest.fn();

    defaultProps = {
      axis,
      setValueAxis,
      setValueAxisScale,
      setMultipleValidity,
    } as any;
  });

  afterEach(() => {
    setValueAxis.mockClear();
    setValueAxisScale.mockClear();
    setMultipleValidity.mockClear();
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<CustomExtentsOptions {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  describe('boundsMargin', () => {
    beforeEach(() => {
      defaultProps.axis.scale.defaultYExtents = true;
    });

    it('should set validity as true when value is positive', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      act(() => {
        comp.find({ paramName: 'boundsMargin' }).prop('setValue')('boundsMargin', 5);
      });

      expect(setMultipleValidity).toBeCalledWith('boundsMargin', true);
    });

    it('should set validity as true when value is empty', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      act(() => {
        comp.find({ paramName: 'boundsMargin' }).prop('setValue')('boundsMargin', '');
      });

      expect(setMultipleValidity).toBeCalledWith('boundsMargin', true);
    });

    it('should set validity as false when value is negative', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      act(() => {
        comp.find({ paramName: 'boundsMargin' }).prop('setValue')('boundsMargin', -1);
      });

      expect(setMultipleValidity).toBeCalledWith('boundsMargin', false);
    });
  });

  describe('defaultYExtents', () => {
    beforeEach(() => {
      defaultProps.axis.scale.boundsMargin = 1;
    });

    it('should show bounds margin input when defaultYExtents is true', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);

      expect(comp.find({ paramName: 'boundsMargin' }).exists()).toBeTruthy();
    });

    it('should hide bounds margin input when defaultYExtents is false', () => {
      defaultProps.axis.scale.defaultYExtents = false;
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);

      expect(comp.find({ paramName: 'boundsMargin' }).exists()).toBeFalsy();
    });

    it('should call setValueAxis when value is true', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      act(() => {
        comp.find({ paramName: 'defaultYExtents' }).prop('setValue')('defaultYExtents', true);
      });

      expect(setMultipleValidity).not.toBeCalled();
      const newScale = { ...defaultProps.axis.scale, defaultYExtents: true };
      expect(setValueAxis).toBeCalledWith('scale', newScale);
    });

    it('should reset boundsMargin when value is false', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      act(() => {
        comp.find({ paramName: 'defaultYExtents' }).prop('setValue')('defaultYExtents', false);
      });

      expect(setMultipleValidity).toBeCalledWith('boundsMargin', true);
      const newScale = {
        ...defaultProps.axis.scale,
        boundsMargin: undefined,
        defaultYExtents: false,
      };
      expect(setValueAxis).toBeCalledWith('scale', newScale);
    });
  });

  describe('setYExtents', () => {
    beforeEach(() => {
      defaultProps.axis.scale.min = 1;
      defaultProps.axis.scale.max = 1;
    });

    it('should show YExtents when value is true', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);

      expect(comp.find(YExtents).exists()).toBeTruthy();
    });

    it('should hide YExtents when value is false', () => {
      defaultProps.axis.scale.setYExtents = false;
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);

      expect(comp.find(YExtents).exists()).toBeFalsy();
    });

    it('should call setValueAxis when value is true', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      act(() => {
        comp.find({ paramName: 'setYExtents' }).prop('setValue')('setYExtents', true);
      });

      const newScale = { ...defaultProps.axis.scale, setYExtents: true };
      expect(setValueAxis).toBeCalledWith('scale', newScale);
    });

    it('should reset min and max when value is false', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      act(() => {
        comp.find({ paramName: 'setYExtents' }).prop('setValue')('setYExtents', false);
      });

      const newScale = {
        ...defaultProps.axis.scale,
        min: undefined,
        max: undefined,
        setYExtents: false,
      };
      expect(setValueAxis).toBeCalledWith('scale', newScale);
    });
  });
});
