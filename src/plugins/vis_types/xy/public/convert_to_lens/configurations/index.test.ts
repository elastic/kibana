/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Column } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { getConfiguration } from '.';
import { Layer } from '..';
import { ChartType } from '../..';
import { sampleAreaVis } from '../../sample_vis.test.mocks';
import { ChartMode, InterpolationMode } from '../../types';

describe('getConfiguration', () => {
  const layers: Layer[] = [
    {
      indexPatternId: '',
      layerId: 'layer-1',
      columns: [
        { columnId: '1', isBucketed: false },
        { columnId: '2', isBucketed: true, isSplit: false, operationType: 'date_histogram' },
        { columnId: '3', isBucketed: true, isSplit: true },
      ] as Column[],
      metrics: ['1'],
      columnOrder: [],
      seriesIdsMap: { 1: '1' },
      collapseFn: 'max',
      isReferenceLineLayer: false,
    },
    {
      indexPatternId: '',
      layerId: 'layer-2',
      columns: [
        { columnId: '4', isBucketed: false },
        { columnId: '5', isBucketed: true, isSplit: false, operationType: 'date_histogram' },
      ] as Column[],
      metrics: ['4'],
      columnOrder: [],
      seriesIdsMap: { 4: '2' },
      collapseFn: undefined,
      isReferenceLineLayer: false,
    },
    {
      indexPatternId: '',
      layerId: 'layer-3',
      columns: [{ columnId: '7', isBucketed: false }] as Column[],
      columnOrder: [],
      metrics: ['7'],
      seriesIdsMap: {},
      collapseFn: undefined,
      isReferenceLineLayer: true,
    },
  ];
  const series = [
    {
      show: true,
      type: ChartType.Area,
      mode: ChartMode.Stacked,
      data: {
        label: 'Sum of total_quantity',
        id: '1',
      },
      drawLinesBetweenPoints: true,
      showCircles: true,
      circlesRadius: 5,
      interpolate: InterpolationMode.Linear,
      valueAxis: 'ValueAxis-1',
    },
    {
      show: true,
      type: ChartType.Line,
      mode: ChartMode.Stacked,
      data: {
        label: 'Sum of total_quantity 1',
        id: '2',
      },
      drawLinesBetweenPoints: true,
      showCircles: true,
      circlesRadius: 5,
      interpolate: InterpolationMode.Linear,
      valueAxis: 'ValueAxis-1',
    },
  ];

  test('should return correct configuration', () => {
    expect(getConfiguration(layers, series, sampleAreaVis as any)).toEqual({
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      curveType: 'LINEAR',
      fillOpacity: 0.5,
      fittingFunction: undefined,
      gridlinesVisibilitySettings: { x: false, yLeft: false, yRight: true },
      labelsOrientation: { x: -0, yLeft: -0, yRight: -90 },
      layers: [
        {
          accessors: ['1'],
          collapseFn: 'max',
          isHistogram: true,
          layerId: 'layer-1',
          layerType: 'data',
          palette: { name: 'default' },
          seriesType: 'area_stacked',
          simpleView: false,
          splitAccessor: '3',
          xAccessor: '2',
          xScaleType: 'ordinal',
          yConfig: [{ axisMode: 'left', forAccessor: '1' }],
        },
        {
          accessors: ['4'],
          collapseFn: undefined,
          isHistogram: true,
          layerId: 'layer-2',
          layerType: 'data',
          palette: { name: 'default' },
          seriesType: 'area_stacked',
          simpleView: false,
          splitAccessor: undefined,
          xAccessor: '5',
          xScaleType: 'ordinal',
          yConfig: [{ axisMode: 'left', forAccessor: '4' }],
        },
        {
          accessors: ['7'],
          layerId: 'layer-3',
          layerType: 'referenceLine',
          yConfig: [
            {
              axisMode: 'left',
              color: '#E7664C',
              forAccessor: '7',
              lineStyle: 'solid',
              lineWidth: 1,
            },
          ],
        },
      ],
      legend: {
        isVisible: true,
        legendSize: 'small',
        maxLines: 1,
        position: 'top',
        shouldTruncate: true,
        showSingleSeries: true,
      },
      tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
      valueLabels: 'hide',
      valuesInLegend: false,
      xTitle: undefined,
      yLeftExtent: { enforce: true, lowerBound: undefined, mode: 'full', upperBound: undefined },
      yLeftScale: 'linear',
      yRightExtent: undefined,
      yRightScale: 'linear',
      yRightTitle: undefined,
      yTitle: 'Sum of total_quantity',
      showCurrentTimeMarker: false,
    });
  });
});
