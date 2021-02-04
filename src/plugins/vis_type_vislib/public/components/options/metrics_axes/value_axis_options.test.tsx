/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ValueAxisOptions, ValueAxisOptionsParams } from './value_axis_options';
import { ValueAxis } from '../../../types';
import { TextInputOption } from '../../../../../charts/public';
import { LabelOptions } from './label_options';
import { ScaleTypes, Positions } from '../../../utils/collections';
import { valueAxis, vis } from './mocks';

const POSITION = 'position';

interface PositionOption {
  text: string;
  value: Positions;
  disabled: boolean;
}

describe('ValueAxisOptions component', () => {
  let setParamByIndex: jest.Mock;
  let onValueAxisPositionChanged: jest.Mock;
  let setMultipleValidity: jest.Mock;
  let defaultProps: ValueAxisOptionsParams;
  let axis: ValueAxis;

  beforeEach(() => {
    setParamByIndex = jest.fn();
    setMultipleValidity = jest.fn();
    onValueAxisPositionChanged = jest.fn();
    axis = { ...valueAxis };

    defaultProps = {
      axis,
      index: 0,
      valueAxis,
      vis,
      isCategoryAxisHorizontal: false,
      setParamByIndex,
      onValueAxisPositionChanged,
      setMultipleValidity,
    };
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<ValueAxisOptions {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should hide options when axis.show is false', () => {
    defaultProps.axis.show = false;
    const comp = shallow(<ValueAxisOptions {...defaultProps} />);

    expect(comp.find(TextInputOption).exists()).toBeFalsy();
    expect(comp.find(LabelOptions).exists()).toBeFalsy();
  });

  it('should only allow left and right value axis position when category axis is horizontal', () => {
    defaultProps.isCategoryAxisHorizontal = true;
    const comp = shallow(<ValueAxisOptions {...defaultProps} />);

    const options: PositionOption[] = comp.find({ paramName: POSITION }).prop('options');

    expect(options.length).toBe(4);
    options.forEach(({ value, disabled }) => {
      switch (value) {
        case Positions.LEFT:
        case Positions.RIGHT:
          expect(disabled).toBeFalsy();
          break;
        case Positions.TOP:
        case Positions.BOTTOM:
          expect(disabled).toBeTruthy();
          break;
      }
    });
  });

  it('should only allow top and bottom value axis position when category axis is vertical', () => {
    defaultProps.isCategoryAxisHorizontal = false;
    const comp = shallow(<ValueAxisOptions {...defaultProps} />);

    const options: PositionOption[] = comp.find({ paramName: POSITION }).prop('options');

    expect(options.length).toBe(4);
    options.forEach(({ value, disabled }) => {
      switch (value) {
        case Positions.LEFT:
        case Positions.RIGHT:
          expect(disabled).toBeTruthy();
          break;
        case Positions.TOP:
        case Positions.BOTTOM:
          expect(disabled).toBeFalsy();
          break;
      }
    });
  });

  it('should call onValueAxisPositionChanged when position is changed', () => {
    const value = Positions.RIGHT;
    const comp = shallow(<ValueAxisOptions {...defaultProps} />);
    comp.find({ paramName: POSITION }).prop('setValue')(POSITION, value);

    expect(onValueAxisPositionChanged).toBeCalledWith(defaultProps.index, value);
  });

  it('should call setValueAxis when title is changed', () => {
    defaultProps.axis.show = true;
    const textValue = 'New title';
    const comp = shallow(<ValueAxisOptions {...defaultProps} />);
    comp.find(TextInputOption).prop('setValue')('text', textValue);

    expect(setParamByIndex).toBeCalledWith('valueAxes', defaultProps.index, 'title', {
      text: textValue,
    });
  });

  it('should call setValueAxis when scale value is changed', () => {
    const scaleValue = ScaleTypes.SQUARE_ROOT;
    const comp = shallow(<ValueAxisOptions {...defaultProps} />);
    comp.find({ paramName: 'type' }).prop('setValue')('type', scaleValue);

    expect(setParamByIndex).toBeCalledWith('valueAxes', defaultProps.index, 'scale', {
      ...defaultProps.axis.scale,
      type: scaleValue,
    });
  });
});
