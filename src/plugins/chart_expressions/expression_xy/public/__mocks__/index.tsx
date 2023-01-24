/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';
import { Datatable } from '@kbn/expressions-plugin/common';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { LayerTypes } from '../../common/constants';
import { DataLayerConfig, XYProps } from '../../common/types';
import { mockPaletteOutput, sampleArgs } from '../../common/__mocks__';

const chartSetupContract = chartPluginMock.createSetupContract();
const chartStartContract = chartPluginMock.createStartContract();

export const chartsThemeService = chartSetupContract.theme;
export const chartsActiveCursorService = chartStartContract.activeCursor;

export const paletteService = chartPluginMock.createPaletteRegistry();

export const dateHistogramData: Datatable = {
  type: 'datatable',
  rows: [
    {
      xAccessorId: 1585758120000,
      splitAccessorId: "Men's Clothing",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585758360000,
      splitAccessorId: "Women's Accessories",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585758360000,
      splitAccessorId: "Women's Clothing",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585759380000,
      splitAccessorId: "Men's Clothing",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585759380000,
      splitAccessorId: "Men's Shoes",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585759380000,
      splitAccessorId: "Women's Clothing",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585760700000,
      splitAccessorId: "Men's Clothing",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585760760000,
      splitAccessorId: "Men's Clothing",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585760760000,
      splitAccessorId: "Men's Shoes",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585761120000,
      splitAccessorId: "Men's Shoes",
      yAccessorId: 1,
    },
  ],
  columns: [
    {
      id: 'xAccessorId',
      name: 'order_date per minute',
      meta: {
        type: 'date',
        field: 'order_date',
        source: 'esaggs',
        index: 'indexPatternId',
        sourceParams: {
          indexPatternId: 'indexPatternId',
          type: 'date_histogram',
          appliedTimeRange: {
            from: '2020-04-01T16:14:16.246Z',
            to: '2020-04-01T17:15:41.263Z',
          },
          params: {
            field: 'order_date',
            timeRange: { from: '2020-04-01T16:14:16.246Z', to: '2020-04-01T17:15:41.263Z' },
            useNormalizedEsInterval: true,
            scaleMetricValues: false,
            interval: '1m',
            drop_partials: false,
            min_doc_count: 0,
            extended_bounds: {},
          },
        },
        params: { id: 'date', params: { pattern: 'HH:mm' } },
      },
    },
    {
      id: 'splitAccessorId',
      name: 'Top values of category.keyword',
      meta: {
        type: 'string',
        field: 'category.keyword',
        source: 'esaggs',
        index: 'indexPatternId',
        sourceParams: {
          indexPatternId: 'indexPatternId',
          type: 'terms',
          params: {
            field: 'category.keyword',
            orderBy: 'yAccessorId',
            order: 'desc',
            size: 3,
            otherBucket: false,
            otherBucketLabel: 'Other',
            missingBucket: false,
            missingBucketLabel: 'Missing',
          },
        },
        params: {
          id: 'terms',
          params: {
            id: 'string',
            otherBucketLabel: 'Other',
            missingBucketLabel: 'Missing',
            parsedUrl: {
              origin: 'http://localhost:5601',
              pathname: '/jiy/app/kibana',
              basePath: '/jiy',
            },
          },
        },
      },
    },
    {
      id: 'yAccessorId',
      name: 'Count of records',
      meta: {
        type: 'number',
        source: 'esaggs',
        index: 'indexPatternId',
        sourceParams: {
          indexPatternId: 'indexPatternId',
          params: {},
        },
        params: { id: 'number' },
      },
    },
  ],
};

export const dateHistogramLayer: DataLayerConfig = {
  layerId: 'dateHistogramLayer',
  type: 'dataLayer',
  layerType: LayerTypes.DATA,
  showLines: true,
  simpleView: false,
  xAccessor: 'xAccessorId',
  xScaleType: 'time',
  isHistogram: true,
  isStacked: true,
  isPercentage: false,
  isHorizontal: false,
  splitAccessors: ['splitAccessorId'],
  seriesType: 'bar',
  accessors: ['yAccessorId'],
  palette: mockPaletteOutput,
  table: dateHistogramData,
};

export function sampleArgsWithReferenceLine(value: number = 150) {
  const { args: sArgs } = sampleArgs();
  const data: Datatable = {
    type: 'datatable',
    columns: [
      {
        id: 'referenceLine-a',
        meta: { params: { id: 'number' }, type: 'number' },
        name: 'Static value',
      },
    ],
    rows: [{ 'referenceLine-a': value }],
  };

  const args: XYProps = {
    ...sArgs,
    layers: [
      ...sArgs.layers,
      {
        layerId: 'referenceLine-a',
        type: 'referenceLineLayer',
        layerType: LayerTypes.REFERENCELINE,
        accessors: ['referenceLine-a'],
        decorations: [
          {
            forAccessor: 'referenceLine-a',
            type: 'referenceLineDecorationConfig',
            position: Position.Left,
          },
        ],
        table: data,
      },
    ],
  };

  return { data, args };
}
