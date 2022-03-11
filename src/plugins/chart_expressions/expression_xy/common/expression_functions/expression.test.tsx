/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';
import { LegendConfig, AxesSettingsConfig, LabelsOrientationConfig, DataLayerArgs } from '../types';
import {
  xyChartFunction,
  dataLayerConfigFunction,
  legendConfigFunction,
  tickLabelsConfigFunction,
  gridlinesConfigFunction,
  labelsOrientationConfigFunction,
} from '../expression_functions';
import { createMockExecutionContext } from '../../../../../plugins/expressions/common/mocks';
import { mockPaletteOutput, sampleArgs } from '../__mocks__';

describe('xy_expression', () => {
  describe('configs', () => {
    test('legendConfigFunction produces the correct arguments', () => {
      const args: LegendConfig = {
        isVisible: true,
        position: Position.Left,
      };

      const result = legendConfigFunction.fn(null, args, createMockExecutionContext());

      expect(result).toEqual({
        type: 'lens_xy_legendConfigFunction',
        ...args,
      });
    });

    test('dataLayerConfigFunction produces the correct arguments', () => {
      const args: DataLayerArgs = {
        layerId: 'first',
        seriesType: 'line',
        xAccessor: 'c',
        accessors: ['a', 'b'],
        splitAccessor: 'd',
        xScaleType: 'linear',
        yScaleType: 'linear',
        isHistogram: false,
        palette: mockPaletteOutput,
      };

      const result = dataLayerConfigFunction.fn(null, args, createMockExecutionContext());

      expect(result).toEqual({
        type: 'lens_xy_data_layer',
        ...args,
      });
    });
  });

  test('tickLabelsConfigFunction produces the correct arguments', () => {
    const args: AxesSettingsConfig = {
      x: true,
      yLeft: false,
      yRight: false,
    };

    const result = tickLabelsConfigFunction.fn(null, args, createMockExecutionContext());

    expect(result).toEqual({
      type: 'lens_xy_tickLabelsConfigFunction',
      ...args,
    });
  });

  test('gridlinesConfigFunction produces the correct arguments', () => {
    const args: AxesSettingsConfig = {
      x: true,
      yLeft: false,
      yRight: false,
    };

    const result = gridlinesConfigFunction.fn(null, args, createMockExecutionContext());

    expect(result).toEqual({
      type: 'lens_xy_gridlinesConfigFunction',
      ...args,
    });
  });

  test('labelsOrientationConfigFunction produces the correct arguments', () => {
    const args: LabelsOrientationConfig = {
      x: 0,
      yLeft: -90,
      yRight: -45,
    };

    const result = labelsOrientationConfigFunction.fn(null, args, createMockExecutionContext());

    expect(result).toEqual({
      type: 'lens_xy_labelsOrientationConfigFunction',
      ...args,
    });
  });

  describe('xyChartFunction', () => {
    test('it renders with the specified data and args', () => {
      const { data, args } = sampleArgs();
      const result = xyChartFunction.fn(data, args, createMockExecutionContext());

      expect(result).toEqual({
        type: 'render',
        as: 'lens_xy_chart_renderer',
        value: { data, args },
      });
    });
  });
});
