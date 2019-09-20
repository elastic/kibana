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
import { CustomExtentsOptions, CustomExtentsOptionsProps } from '../custom_extents_options';
import { ValueAxis } from '../../../../types';
import { YExtents } from '../y_extents';

describe('CustomExtentsOptions component', () => {
  let setValueAxis: jest.Mock;
  let setValueAxisScale: jest.Mock;
  let setMultipleValidity: jest.Mock;
  let defaultProps: CustomExtentsOptionsProps;
  let axis: ValueAxis;
  const boundsMarginParamName = 'boundsMargin';
  const defaultYExtentsParamName = 'defaultYExtents';
  const scaleParamName = 'scale';
  const setYExtentsParamName = 'setYExtents';

  beforeEach(() => {
    setValueAxis = jest.fn();
    setValueAxisScale = jest.fn();
    setMultipleValidity = jest.fn();
    axis = {
      scale: {
        defaultYExtents: true,
        boundsMargin: undefined,
        setYExtents: true,
        min: undefined,
        max: undefined,
      },
    } as ValueAxis;

    defaultProps = {
      axis,
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
    beforeEach(() => {
      defaultProps.axis.scale.defaultYExtents = true;
    });

    it('should set validity as true when value is positive', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      comp.find({ paramName: boundsMarginParamName }).prop('setValue')(boundsMarginParamName, 5);

      expect(setMultipleValidity).toBeCalledWith(boundsMarginParamName, true);
    });

    it('should set validity as true when value is empty', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      comp.find({ paramName: boundsMarginParamName }).prop('setValue')(boundsMarginParamName, '');

      expect(setMultipleValidity).toBeCalledWith(boundsMarginParamName, true);
    });

    it('should set validity as false when value is negative', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      comp.find({ paramName: boundsMarginParamName }).prop('setValue')(boundsMarginParamName, -1);

      expect(setMultipleValidity).toBeCalledWith(boundsMarginParamName, false);
    });
  });

  describe('defaultYExtents', () => {
    beforeEach(() => {
      defaultProps.axis.scale.boundsMargin = 1;
    });

    it('should show bounds margin input when defaultYExtents is true', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);

      expect(comp.find({ paramName: boundsMarginParamName }).exists()).toBeTruthy();
    });

    it('should hide bounds margin input when defaultYExtents is false', () => {
      defaultProps.axis.scale.defaultYExtents = false;
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);

      expect(comp.find({ paramName: boundsMarginParamName }).exists()).toBeFalsy();
    });

    it('should call setValueAxis when value is true', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      comp.find({ paramName: defaultYExtentsParamName }).prop('setValue')(
        defaultYExtentsParamName,
        true
      );

      expect(setMultipleValidity).not.toBeCalled();
      const newScale = { ...defaultProps.axis.scale, defaultYExtents: true };
      expect(setValueAxis).toBeCalledWith(scaleParamName, newScale);
    });

    it('should reset boundsMargin when value is false', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      comp.find({ paramName: defaultYExtentsParamName }).prop('setValue')(
        defaultYExtentsParamName,
        false
      );

      expect(setMultipleValidity).toBeCalledWith(boundsMarginParamName, true);
      const newScale = {
        ...defaultProps.axis.scale,
        boundsMargin: undefined,
        defaultYExtents: false,
      };
      expect(setValueAxis).toBeCalledWith(scaleParamName, newScale);
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
      comp.find({ paramName: setYExtentsParamName }).prop('setValue')(setYExtentsParamName, true);

      const newScale = { ...defaultProps.axis.scale, setYExtents: true };
      expect(setValueAxis).toBeCalledWith(scaleParamName, newScale);
    });

    it('should reset min and max when value is false', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      comp.find({ paramName: setYExtentsParamName }).prop('setValue')(setYExtentsParamName, false);

      const newScale = {
        ...defaultProps.axis.scale,
        min: undefined,
        max: undefined,
        setYExtents: false,
      };
      expect(setValueAxis).toBeCalledWith(scaleParamName, newScale);
    });
  });
});
