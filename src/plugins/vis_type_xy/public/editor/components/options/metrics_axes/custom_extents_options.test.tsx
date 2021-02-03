/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
      axisScale: { ...valueAxis.scale },
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
      defaultProps.axisScale.boundsMargin = 5;
      mount(<CustomExtentsOptions {...defaultProps} />);

      expect(setMultipleValidity).toBeCalledWith(BOUNDS_MARGIN, true);
    });

    it('should set validity as true when value is empty', () => {
      const comp = mount(<CustomExtentsOptions {...defaultProps} />);
      comp.setProps({
        axisScale: { ...valueAxis.scale, boundsMargin: undefined },
      });

      expect(setMultipleValidity).toBeCalledWith(BOUNDS_MARGIN, true);
    });

    it('should set validity as false when value is negative', () => {
      defaultProps.axisScale.defaultYExtents = true;
      const comp = mount(<CustomExtentsOptions {...defaultProps} />);
      comp.setProps({
        axisScale: { ...valueAxis.scale, boundsMargin: -1 },
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
      defaultProps.axisScale = { ...defaultProps.axisScale, defaultYExtents: false };
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);

      expect(comp.find({ paramName: BOUNDS_MARGIN }).exists()).toBeFalsy();
    });

    it('should call setValueAxis when value is true', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      comp.find({ paramName: DEFAULT_Y_EXTENTS }).prop('setValue')(DEFAULT_Y_EXTENTS, true);

      expect(setMultipleValidity).not.toBeCalled();
      expect(setValueAxis).toBeCalledWith(SCALE, defaultProps.axisScale);
    });

    it('should reset boundsMargin when value is false', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      comp.find({ paramName: DEFAULT_Y_EXTENTS }).prop('setValue')(DEFAULT_Y_EXTENTS, false);

      const newScale = {
        ...defaultProps.axisScale,
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
      defaultProps.axisScale = { ...defaultProps.axisScale, setYExtents: false };
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);

      expect(comp.find(YExtents).exists()).toBeFalsy();
    });

    it('should call setValueAxis when value is true', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      comp.find({ paramName: SET_Y_EXTENTS }).prop('setValue')(SET_Y_EXTENTS, true);

      expect(setValueAxis).toBeCalledWith(SCALE, defaultProps.axisScale);
    });

    it('should reset min and max when value is false', () => {
      const comp = shallow(<CustomExtentsOptions {...defaultProps} />);
      comp.find({ paramName: SET_Y_EXTENTS }).prop('setValue')(SET_Y_EXTENTS, false);

      const newScale = {
        ...defaultProps.axisScale,
        min: undefined,
        max: undefined,
        setYExtents: false,
      };
      expect(setValueAxis).toBeCalledWith(SCALE, newScale);
    });
  });
});
