/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorSchemas } from '@kbn/charts-plugin/common';
import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { getGaugeConfiguration } from './gauge';
import { GaugeType, GaugeVisParams } from '../../types';
import { merge } from 'lodash';

const params: GaugeVisParams = {
  addTooltip: false,
  addLegend: false,
  isDisplayWarning: true,
  gauge: {
    type: 'meter',
    orientation: 'vertical',
    alignment: 'automatic',
    gaugeType: 'Arc',
    scale: {
      color: 'rgba(105,112,125,0.2)',
      labels: false,
      show: false,
    },
    gaugeStyle: 'Full',
    extendRange: false,
    backStyle: 'Full',
    percentageMode: false,
    percentageFormatPattern: '',
    colorSchema: ColorSchemas.Greys,
    colorsRange: [
      { type: 'range', from: 0, to: 100 },
      { type: 'range', from: 100, to: 200 },
    ],
    labels: {},
    invertColors: false,
    style: {
      bgFill: '',
      bgColor: false,
      labelColor: false,
      subText: '',
      fontSize: 10,
    },
  },
  type: 'gauge',
};

describe.each(['gauge', 'goal'])('getConfiguration - %s', (type) => {
  const layerId = 'layer-id';
  const metricAccessor = 'metric-id';
  const minAccessor = 'min-accessor';
  const maxAccessor = 'max-accessor';

  const getPalette = (gaugeType: GaugeType) =>
    ({
      name: 'custom',
      params: { name: 'custom', gaugeType },
      type: 'palette',
    } as PaletteOutput<CustomPaletteParams>);

  test('should return correct configuration - Arc', () => {
    expect(
      getGaugeConfiguration(layerId, merge({}, params, { type }), getPalette('Arc'), {
        metricAccessor,
        minAccessor,
        maxAccessor,
      })
    ).toEqual({
      colorMode: 'palette',
      labelMajorMode: 'none',
      layerId: 'layer-id',
      layerType: 'data',
      maxAccessor: 'max-accessor',
      metricAccessor: 'metric-id',
      minAccessor: 'min-accessor',
      palette: {
        name: 'custom',
        params: { name: 'custom', gaugeType: 'Arc' },
        type: 'palette',
      },
      percentageMode: false,
      shape: 'arc',
      ticksPosition: 'bands',
    });
  });

  test('should return correct configuration - Circle', () => {
    expect(
      getGaugeConfiguration(layerId, merge({}, params, { type }), getPalette('Circle'), {
        metricAccessor,
        minAccessor,
        maxAccessor,
      })
    ).toEqual({
      colorMode: 'palette',
      labelMajorMode: 'none',
      layerId: 'layer-id',
      layerType: 'data',
      maxAccessor: 'max-accessor',
      metricAccessor: 'metric-id',
      minAccessor: 'min-accessor',
      palette: {
        name: 'custom',
        params: { name: 'custom', gaugeType: 'Circle' },
        type: 'palette',
      },
      percentageMode: false,
      shape: 'arc',
      ticksPosition: 'bands',
    });
  });

  test('should return correct ticksPosition with scale shown', () => {
    expect(
      getGaugeConfiguration(
        layerId,
        merge({}, params, {
          type,
          gauge: {
            scale: {
              show: true,
            },
          },
        }),
        getPalette('Circle'),
        {
          metricAccessor,
          minAccessor,
          maxAccessor,
        }
      )
    ).toMatchObject({
      ticksPosition: 'auto',
    });
  });

  test('should return correct custom labels', () => {
    expect(
      getGaugeConfiguration(
        layerId,
        merge({}, params, {
          type,
          gauge: {
            labels: {
              show: true,
            },
            style: {
              subText: 'label minor',
            },
          },
        }),
        getPalette('Circle'),
        {
          metricAccessor,
          minAccessor,
          maxAccessor,
        }
      )
    ).toMatchObject({
      labelMajorMode: 'custom',
      labelMinor: 'label minor',
    });
  });

  test('should return correct auto labels', () => {
    expect(
      getGaugeConfiguration(
        layerId,
        merge({}, params, {
          type,
          gauge: {
            labels: {
              show: true,
            },
          },
        }),
        getPalette('Circle'),
        {
          metricAccessor,
          minAccessor,
          maxAccessor,
        }
      )
    ).toMatchObject({
      labelMajorMode: 'auto',
    });
  });
});
