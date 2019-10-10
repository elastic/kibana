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
import { ValueAxisOptions, ValueAxisOptionsParams } from './value_axis_options';
import { Axis } from '../../../types';
import { TextInputOption } from '../../common';
import { LabelOptions } from './label_options';
import {
  ScaleTypes,
  Positions,
  getScaleTypes,
  getAxisModes,
  getPositions,
} from '../../../utils/collections';
import { valueAxis, categoryAxis } from './mocks';

const POSITION = 'position';
const positions = getPositions();
const axisModes = getAxisModes();
const scaleTypes = getScaleTypes();

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
  let axis: Axis;

  beforeEach(() => {
    setParamByIndex = jest.fn();
    setMultipleValidity = jest.fn();
    onValueAxisPositionChanged = jest.fn();
    axis = { ...valueAxis };

    defaultProps = {
      axis,
      index: 0,
      stateParams: {
        categoryAxes: [{ ...categoryAxis }],
        valueAxes: [axis],
      },
      vis: {
        type: {
          editorConfig: {
            collections: { scaleTypes, axisModes, positions },
          },
        },
      },
      isCategoryAxisHorizontal: false,
      setParamByIndex,
      onValueAxisPositionChanged,
      setMultipleValidity,
    } as any;
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
