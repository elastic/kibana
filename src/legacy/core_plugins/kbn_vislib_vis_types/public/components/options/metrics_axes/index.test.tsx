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
import { mount, shallow } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { MetricsAxisOptions } from './index';
import { SeriesParam, ValueAxis } from '../../../types';
import { Positions, ScaleTypes } from '../../../utils/collections';
import { LineOptions } from './line_options';
import {
  ChartTypes,
  ChartModes,
  InterpolationModes,
  interpolationModes,
  chartTypes,
  chartModes,
} from '../../../utils/collections';

describe('MetricsAxisOptions component', () => {
  let setParamByIndex: jest.Mock;
  let changeValueAxis: jest.Mock;
  let defaultProps: SeriesPanelProps;
  const chart = {
    show: true,
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
  const axis = {
    id: 'ValueAxis-1',
    name: 'ValueAxis-1',
    position: Positions.LEFT,
    scale: {
      type: ScaleTypes.LINEAR,
    },
    title: {},
    show: true,
    labels: {
      show: true,
      filter: false,
      truncate: 0,
    },
  } as ValueAxis;

  beforeEach(() => {
    setParamByIndex = jest.fn();
    changeValueAxis = jest.fn();
    chart.type = ChartTypes.HISTOGRAM;

    defaultProps = {
      index: 0,
      chart,
      vis: {
        type: {
          editorConfig: {
            collections: { interpolationModes, chartTypes, chartModes },
          },
        },
      },
      stateParams: {
        valueAxes: [axis],
      },
      setParamByIndex,
      changeValueAxis,
    } as any;
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<MetricsAxisOptions {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should update series when new agg is added', () => {});

  it('should add value axis', () => {});

  it('should remove value axis', () => {});

  it('should not allow to remove the last value axis', () => {});

  it('should set the value axis title if its not set', () => {});

  it('should not update the value axis title if custom title was set', () => {});

  it('should set the custom title to match the value axis label when only one agg exists for that axis', () => {});

  it('should not set the custom title to match the value axis label when more than one agg exists for that axis', () => {});

  it('should not overwrite the custom title with the value axis label if the custom title has been changed', () => {});

  it('should overwrite the custom title when the agg type changes', () => {});
});
