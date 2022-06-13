/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chartPluginMock } from '../../../../../plugins/charts/public/mocks';
import { DataLayerConfigResult, LensMultiTable, XYArgs } from '../../common';
import { LayerTypes } from '../../common/constants';
import { mockPaletteOutput, sampleArgs } from '../../common/__mocks__';

const chartSetupContract = chartPluginMock.createSetupContract();
const chartStartContract = chartPluginMock.createStartContract();

export const chartsThemeService = chartSetupContract.theme;
export const chartsActiveCursorService = chartStartContract.activeCursor;

export const paletteService = chartPluginMock.createPaletteRegistry();

export const dateHistogramData: LensMultiTable = {
  type: 'lens_multitable',
  tables: {
    timeLayer: {
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
    },
  },
  dateRange: {
    fromDate: new Date('2020-04-01T16:14:16.246Z'),
    toDate: new Date('2020-04-01T17:15:41.263Z'),
  },
};

export const dateHistogramLayer: DataLayerConfigResult = {
  type: 'dataLayer',
  layerId: 'timeLayer',
  layerType: LayerTypes.DATA,
  hide: false,
  xAccessor: 'xAccessorId',
  yScaleType: 'linear',
  xScaleType: 'time',
  isHistogram: true,
  splitAccessor: 'splitAccessorId',
  seriesType: 'bar_stacked',
  accessors: ['yAccessorId'],
  palette: mockPaletteOutput,
};

export function sampleArgsWithReferenceLine(value: number = 150) {
  const { data, args } = sampleArgs();

  return {
    data: {
      ...data,
      tables: {
        ...data.tables,
        referenceLine: {
          type: 'datatable',
          columns: [
            {
              id: 'referenceLine-a',
              meta: { params: { id: 'number' }, type: 'number' },
              name: 'Static value',
            },
          ],
          rows: [{ 'referenceLine-a': value }],
        },
      },
    } as LensMultiTable,
    args: {
      ...args,
      layers: [
        ...args.layers,
        {
          layerType: LayerTypes.REFERENCELINE,
          accessors: ['referenceLine-a'],
          layerId: 'referenceLine',
          seriesType: 'line',
          xScaleType: 'linear',
          yScaleType: 'linear',
          palette: mockPaletteOutput,
          isHistogram: false,
          hide: true,
          yConfig: [{ axisMode: 'left', forAccessor: 'referenceLine-a', type: 'yConfig' }],
        },
      ],
    } as XYArgs,
  };
}
