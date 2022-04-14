/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AxisConfig, DataLayerConfigResult } from '../../common';
import { LayerTypes } from '../../common/constants';
import { Datatable } from '../../../../../plugins/expressions/public';
import { getAxesConfiguration } from './axes_configuration';

describe('axes_configuration', () => {
  const tables: Record<string, Datatable> = {
    first: {
      type: 'datatable',
      rows: [
        {
          xAccessorId: 1585758120000,
          splitAccessorId: "Men's Clothing",
          yAccessorId: 1,
          yAccessorId2: 1,
          yAccessorId3: 1,
          yAccessorId4: 4,
        },
        {
          xAccessorId: 1585758360000,
          splitAccessorId: "Women's Accessories",
          yAccessorId: 1,
          yAccessorId2: 1,
          yAccessorId3: 1,
          yAccessorId4: 4,
        },
        {
          xAccessorId: 1585758360000,
          splitAccessorId: "Women's Clothing",
          yAccessorId: 1,
          yAccessorId2: 1,
          yAccessorId3: 1,
          yAccessorId4: 4,
        },
        {
          xAccessorId: 1585759380000,
          splitAccessorId: "Men's Clothing",
          yAccessorId: 1,
          yAccessorId2: 1,
          yAccessorId3: 1,
          yAccessorId4: 4,
        },
        {
          xAccessorId: 1585759380000,
          splitAccessorId: "Men's Shoes",
          yAccessorId: 1,
          yAccessorId2: 1,
          yAccessorId3: 1,
          yAccessorId4: 4,
        },
        {
          xAccessorId: 1585759380000,
          splitAccessorId: "Women's Clothing",
          yAccessorId: 1,
          yAccessorId2: 1,
          yAccessorId3: 1,
          yAccessorId4: 4,
        },
        {
          xAccessorId: 1585760700000,
          splitAccessorId: "Men's Clothing",
          yAccessorId: 1,
          yAccessorId2: 1,
          yAccessorId3: 1,
          yAccessorId4: 4,
        },
        {
          xAccessorId: 1585760760000,
          splitAccessorId: "Men's Clothing",
          yAccessorId: 1,
          yAccessorId2: 1,
          yAccessorId3: 1,
          yAccessorId4: 4,
        },
        {
          xAccessorId: 1585760760000,
          splitAccessorId: "Men's Shoes",
          yAccessorId: 1,
          yAccessorId2: 1,
          yAccessorId3: 1,
          yAccessorId4: 4,
        },
        {
          xAccessorId: 1585761120000,
          splitAccessorId: "Men's Shoes",
          yAccessorId: 1,
          yAccessorId2: 1,
          yAccessorId3: 1,
          yAccessorId4: 4,
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
            params: { params: { id: 'date', params: { pattern: 'HH:mm' } } },
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
              type: 'count',
            },
            params: { id: 'number' },
          },
        },
        {
          id: 'yAccessorId2',
          name: 'Other column',
          meta: {
            type: 'number',
            source: 'esaggs',
            index: 'indexPatternId',
            sourceParams: {
              indexPatternId: 'indexPatternId',
              type: 'average',
            },
            params: { id: 'bytes' },
          },
        },
        {
          id: 'yAccessorId3',
          name: 'Other column',
          meta: {
            type: 'number',
            source: 'esaggs',
            index: 'indexPatternId',
            sourceParams: {
              indexPatternId: 'indexPatternId',
              type: 'average',
            },
            params: { id: 'currency' },
          },
        },
        {
          id: 'yAccessorId4',
          name: 'Other column',
          meta: {
            type: 'number',
            source: 'esaggs',
            index: 'indexPatternId',
            sourceParams: {
              indexPatternId: 'indexPatternId',
              type: 'average',
            },
            params: { id: 'currency' },
          },
        },
      ],
    },
  };

  const axes: AxisConfig[] = [
    {
      id: '1',
      position: 'right',
    },
  ];

  const sampleLayer: DataLayerConfigResult = {
    type: 'dataLayer',
    layerType: LayerTypes.DATA,
    seriesType: 'line',
    xAccessor: 'c',
    accessors: ['yAccessorId'],
    splitAccessor: 'd',
    columnToLabel: '{"a": "Label A", "b": "Label B", "d": "Label D"}',
    xScaleType: 'ordinal',
    yScaleType: 'linear',
    isHistogram: false,
    isPercentage: false,
    palette: { type: 'palette', name: 'default' },
    table: tables.first,
  };

  it('should map auto series to left axis', () => {
    const formatFactory = jest.fn();
    const groups = getAxesConfiguration([sampleLayer], false, [], formatFactory);
    expect(groups.length).toEqual(1);
    expect(groups[0].position).toEqual('left');
    expect(groups[0].series[0].accessor).toEqual('yAccessorId');
    expect(groups[0].series[0].layer).toEqual(0);
  });

  it('should map auto series to right axis if formatters do not match', () => {
    const formatFactory = jest.fn();
    const twoSeriesLayer = { ...sampleLayer, accessors: ['yAccessorId', 'yAccessorId2'] };
    const groups = getAxesConfiguration([twoSeriesLayer], false, [], formatFactory);
    expect(groups.length).toEqual(2);
    expect(groups[0].position).toEqual('left');
    expect(groups[1].position).toEqual('right');
    expect(groups[0].series[0].accessor).toEqual('yAccessorId');
    expect(groups[1].series[0].accessor).toEqual('yAccessorId2');
  });

  it('should map auto series to left if left and right are already filled with non-matching series', () => {
    const formatFactory = jest.fn();
    const threeSeriesLayer = {
      ...sampleLayer,
      accessors: ['yAccessorId', 'yAccessorId2', 'yAccessorId3'],
    };
    const groups = getAxesConfiguration([threeSeriesLayer], false, [], formatFactory);
    expect(groups.length).toEqual(2);
    expect(groups[0].position).toEqual('left');
    expect(groups[1].position).toEqual('right');
    expect(groups[0].series[0].accessor).toEqual('yAccessorId');
    expect(groups[0].series[1].accessor).toEqual('yAccessorId3');
    expect(groups[1].series[0].accessor).toEqual('yAccessorId2');
  });

  it('should map right series to right axis', () => {
    const formatFactory = jest.fn();
    const groups = getAxesConfiguration(
      [
        {
          ...sampleLayer,
          yConfig: [{ type: 'yConfig', forAccessor: 'yAccessorId', axisId: '1' }],
        },
      ],
      false,
      axes,
      formatFactory
    );
    expect(groups.length).toEqual(1);
    expect(groups[0].position).toEqual('right');
    expect(groups[0].series[0].accessor).toEqual('yAccessorId');
    expect(groups[0].series[0].layer).toEqual(0);
  });

  it('should map series with matching formatters to same axis', () => {
    const formatFactory = jest.fn();
    const groups = getAxesConfiguration(
      [
        {
          ...sampleLayer,
          accessors: ['yAccessorId', 'yAccessorId3', 'yAccessorId4'],
          yConfig: [{ type: 'yConfig', forAccessor: 'yAccessorId', axisId: '1' }],
        },
      ],
      false,
      axes,
      formatFactory
    );
    expect(groups.length).toEqual(2);
    expect(groups[0].position).toEqual('right');
    expect(groups[0].series[0].accessor).toEqual('yAccessorId');
    expect(groups[1].position).toEqual('left');
    expect(groups[1].series[0].accessor).toEqual('yAccessorId3');
    expect(groups[1].series[1].accessor).toEqual('yAccessorId4');
    expect(formatFactory).toHaveBeenCalledWith({ id: 'number' });
    expect(formatFactory).toHaveBeenCalledWith({ id: 'currency' });
  });

  it('should create one formatter per series group', () => {
    const formatFactory = jest.fn();
    getAxesConfiguration(
      [
        {
          ...sampleLayer,
          accessors: ['yAccessorId', 'yAccessorId3', 'yAccessorId4'],
          yConfig: [{ type: 'yConfig', forAccessor: 'yAccessorId', axisId: '1' }],
        },
      ],
      false,
      axes,
      formatFactory
    );
    expect(formatFactory).toHaveBeenCalledTimes(2);
    expect(formatFactory).toHaveBeenCalledWith({ id: 'number' });
    expect(formatFactory).toHaveBeenCalledWith({ id: 'currency' });
  });
});
