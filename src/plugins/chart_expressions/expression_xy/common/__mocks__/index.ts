/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';
import type { PaletteOutput } from '@kbn/coloring';
import { Datatable, DatatableRow } from '@kbn/expressions-plugin/common';
import { LayerTypes } from '../constants';
import { DataLayerConfig, ExtendedDataLayerConfig, XYProps } from '../types';

export const mockPaletteOutput: PaletteOutput = {
  type: 'palette',
  name: 'mock',
  params: {},
};

export const createSampleDatatableWithRows = (rows: DatatableRow[]): Datatable => ({
  type: 'datatable',
  columns: [
    {
      id: 'a',
      name: 'a',
      meta: { type: 'number', params: { id: 'number', params: { pattern: '0,0.000' } } },
    },
    {
      id: 'b',
      name: 'b',
      meta: { type: 'number', params: { id: 'number', params: { pattern: '000,0' } } },
    },
    {
      id: 'c',
      name: 'c',
      meta: {
        type: 'date',
        field: 'order_date',
        sourceParams: { type: 'date-histogram', params: { interval: 'auto' } },
        params: { id: 'string' },
      },
    },
    { id: 'd', name: 'ColD', meta: { type: 'string' } },
  ],
  rows,
});

export const sampleLayer: DataLayerConfig = {
  layerId: 'first',
  type: 'dataLayer',
  layerType: LayerTypes.DATA,
  showLines: true,
  seriesType: 'line',
  xAccessor: 'c',
  accessors: ['a', 'b'],
  splitAccessors: ['d'],
  columnToLabel: '{"a": "Label A", "b": "Label B", "d": "Label D"}',
  xScaleType: 'ordinal',
  isHistogram: false,
  isHorizontal: false,
  isPercentage: false,
  isStacked: false,
  palette: mockPaletteOutput,
  table: createSampleDatatableWithRows([]),
};

export const sampleExtendedLayer: ExtendedDataLayerConfig = {
  layerId: 'first',
  type: 'extendedDataLayer',
  layerType: LayerTypes.DATA,
  seriesType: 'line',
  xAccessor: 'c',
  accessors: ['a', 'b'],
  splitAccessors: ['d'],
  columnToLabel: '{"a": "Label A", "b": "Label B", "d": "Label D"}',
  xScaleType: 'ordinal',
  isHistogram: false,
  isHorizontal: false,
  isStacked: false,
  isPercentage: false,
  palette: mockPaletteOutput,
  table: createSampleDatatableWithRows([]),
};

export const createArgsWithLayers = (
  layers: DataLayerConfig | DataLayerConfig[] = sampleLayer
): XYProps => ({
  showTooltip: true,
  minBarHeight: 1,
  legend: {
    type: 'legendConfig',
    isVisible: false,
    position: Position.Top,
  },
  valueLabels: 'hide',
  valuesInLegend: false,
  xAxisConfig: {
    type: 'xAxisConfig',
    position: 'bottom',
    showGridLines: true,
    labelsOrientation: 0,
    showLabels: true,
    showTitle: true,
    title: '',
  },
  yAxisConfigs: [
    {
      type: 'yAxisConfig',
      position: 'right',
      showGridLines: false,
      labelsOrientation: -45,
      showLabels: false,
      showTitle: true,
      title: '',
      extent: {
        mode: 'full',
        type: 'axisExtentConfig',
      },
    },
    {
      type: 'yAxisConfig',
      position: 'left',
      showGridLines: false,
      labelsOrientation: -90,
      showLabels: false,
      showTitle: true,
      title: '',
      extent: {
        mode: 'full',
        type: 'axisExtentConfig',
      },
    },
  ],
  layers: Array.isArray(layers) ? layers : [layers],
  annotations: {
    type: 'event_annotations_result',
    layers: [],
    datatable: {
      type: 'datatable',
      columns: [],
      rows: [],
    },
  },
});

export function sampleArgs() {
  const data = createSampleDatatableWithRows([
    { a: 1, b: 2, c: 1652034840000, d: 'Foo' },
    { a: 1, b: 5, c: 1652122440000, d: 'Bar' },
  ]);

  return {
    data,
    args: createArgsWithLayers({ ...sampleLayer, table: data }),
  };
}
