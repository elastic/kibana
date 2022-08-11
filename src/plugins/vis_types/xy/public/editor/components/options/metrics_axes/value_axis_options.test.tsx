/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { Position } from '@elastic/charts';

import { TextInputOption } from '@kbn/vis-default-editor-plugin/public';

import { ValueAxis, ScaleType } from '../../../../types';
import { LabelOptions } from './label_options';
import { ValueAxisOptions, ValueAxisOptionsParams } from './value_axis_options';
import { valueAxis } from './mocks';

const POSITION = 'position';

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

  it('should call onValueAxisPositionChanged when position is changed', () => {
    const value = Position.Right;
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
    const scaleValue = ScaleType.SquareRoot;
    const comp = shallow(<ValueAxisOptions {...defaultProps} />);
    comp.find({ paramName: 'type' }).prop('setValue')('type', scaleValue);

    expect(setParamByIndex).toBeCalledWith('valueAxes', defaultProps.index, 'scale', {
      ...defaultProps.axis.scale,
      type: scaleValue,
    });
  });
});
