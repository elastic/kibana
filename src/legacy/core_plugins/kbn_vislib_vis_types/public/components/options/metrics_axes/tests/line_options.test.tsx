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
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { LineOptions, LineOptionsParams } from '../line_options';
import { SeriesParam } from '../../../../types';
import { NumberInputOption } from '../../../common';
import {
  ChartTypes,
  ChartModes,
  InterpolationModes,
  interpolationModes,
} from '../../../../utils/collections';

describe('LineOptions component', () => {
  let setChart: jest.Mock;
  let defaultProps: LineOptionsParams;
  const lineWidthParamName = 'lineWidth';
  let chart: SeriesParam;

  beforeEach(() => {
    setChart = jest.fn();
    chart = {
      show: true,
      type: ChartTypes.AREA,
      mode: ChartModes.STACKED,
      data: {
        label: 'Count',
        id: '1',
      },
      drawLinesBetweenPoints: true,
      lineWidth: 2,
      showCircles: true,
      interpolate: InterpolationModes.LINEAR,
      valueAxis: 'ValueAxis-1',
    } as SeriesParam;

    defaultProps = {
      chart,
      vis: {
        type: {
          editorConfig: {
            collections: { interpolationModes },
          },
        },
      },
      setChart,
    } as any;
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<LineOptions {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should set lineWidth as undefined when empty value', () => {
    const comp = mountWithIntl(<LineOptions {...defaultProps} />);
    comp.find(NumberInputOption).prop('setValue')(lineWidthParamName, '');

    expect(setChart).toBeCalledWith(lineWidthParamName, undefined);
  });

  it('should set lineWidth value', () => {
    const comp = mountWithIntl(<LineOptions {...defaultProps} />);
    comp.find(NumberInputOption).prop('setValue')(lineWidthParamName, 5);

    expect(setChart).toBeCalledWith(lineWidthParamName, 5);
  });

  it('should set drawLinesBetweenPoints', () => {
    const comp = shallow(<LineOptions {...defaultProps} />);
    comp.find({ paramName: 'drawLinesBetweenPoints' }).prop('setValue')(
      'drawLinesBetweenPoints',
      false
    );

    expect(setChart).toBeCalledWith('drawLinesBetweenPoints', false);
  });
});
