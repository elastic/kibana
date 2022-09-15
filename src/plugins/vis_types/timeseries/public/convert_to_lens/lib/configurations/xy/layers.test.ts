/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { XYLayerConfig } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { METRIC_TYPES } from '@kbn/data-plugin/public';
import type { Panel } from '../../../../../common/types';
import { TSVB_METRIC_TYPES } from '../../../../../common/enums';
import {
  Layer,
  PercentileColumnWithExtendedMeta,
  PercentileRanksColumnWithCommonMeta,
} from '../../convert';
import { getLayers } from './layers';
import { createPanel, createSeries } from '../../__mocks__';

describe('getLayers', () => {
  const dataSourceLayers: Record<number, Layer> = [
    {
      indexPatternId: 'test',
      layerId: 'test-layer-1',
      columns: [
        {
          operationType: 'count',
          columnId: 'column-id-1',
          sourceField: 'document',
          isBucketed: false,
          isSplit: false,
          dataType: 'number',
          params: {},
          meta: { metricId: 'metric-1' },
        },
        {
          columnId: 'column-id-2',
          operationType: 'date_histogram',
          isBucketed: true,
          isSplit: false,
          sourceField: 'date-field',
          dataType: 'date',
          params: {
            interval: 'auto',
          },
        },
        {
          columnId: 'column-id-3',
          operationType: 'terms',
          isBucketed: true,
          isSplit: true,
          sourceField: 'string-field',
          dataType: 'string',
          params: {
            size: 5,
            orderBy: { type: 'alphabetical' },
            orderDirection: 'desc',
          },
        },
      ],
      columnOrder: [],
    },
  ];
  const dataSourceLayersWithStatic: Record<number, Layer> = [
    {
      indexPatternId: 'test',
      layerId: 'test-layer-1',
      columns: [
        {
          operationType: 'static_value',
          columnId: 'column-id-1',
          isBucketed: false,
          isSplit: false,
          dataType: 'number',
          references: [],
          params: {
            value: '100',
          },
          meta: { metricId: 'metric-1' },
        },
      ],
      columnOrder: [],
    },
  ];
  const dataSourceLayersWithPercentile: Record<number, Layer> = [
    {
      indexPatternId: 'test',
      layerId: 'test-layer-1',
      columns: [
        {
          operationType: 'percentile',
          columnId: 'column-id-1',
          sourceField: 'test-field',
          isBucketed: false,
          isSplit: false,
          dataType: 'number',
          params: {
            percentile: 50,
          },
          meta: { metricId: 'metric-1', reference: 'metric-1.0' },
        } as PercentileColumnWithExtendedMeta,
        {
          operationType: 'percentile',
          columnId: 'column-id-2',
          sourceField: 'test-field',
          isBucketed: false,
          isSplit: false,
          dataType: 'number',
          params: {
            percentile: 100,
          },
          meta: { metricId: 'metric-1', reference: 'metric-1.1' },
        } as PercentileColumnWithExtendedMeta,
      ],
      columnOrder: [],
    },
  ];
  const dataSourceLayersWithPercentileRank: Record<number, Layer> = [
    {
      indexPatternId: 'test',
      layerId: 'test-layer-1',
      columns: [
        {
          operationType: 'percentile_rank',
          columnId: 'column-id-1',
          sourceField: 'test-field',
          isBucketed: false,
          isSplit: false,
          dataType: 'number',
          params: {
            value: 50,
          },
          meta: { metricId: 'metric-1', reference: 'metric-1.0' },
        } as PercentileRanksColumnWithCommonMeta,
        {
          operationType: 'percentile_rank',
          columnId: 'column-id-2',
          sourceField: 'test-field',
          isBucketed: false,
          isSplit: false,
          dataType: 'number',
          params: {
            value: 100,
          },
          meta: { metricId: 'metric-1', reference: 'metric-1.1' },
        } as PercentileRanksColumnWithCommonMeta,
      ],
      columnOrder: [],
    },
  ];
  const metrics = [
    {
      id: 'metric-1',
      type: METRIC_TYPES.COUNT,
    },
  ];

  const staticValueMetric = [
    {
      id: 'metric-1',
      type: TSVB_METRIC_TYPES.STATIC,
    },
  ];

  const percentileMetrics = [
    {
      id: 'metric-1',
      type: TSVB_METRIC_TYPES.PERCENTILE,
      percentiles: [
        {
          id: 'percent-1',
          mode: 'line' as const,
          color: 'color-1',
        },
        {
          id: 'percent-2',
          mode: 'line' as const,
          color: 'color-2',
        },
      ],
    },
  ];

  const percentileRankMetrics = [
    {
      id: 'metric-1',
      type: TSVB_METRIC_TYPES.PERCENTILE_RANK,
      colors: ['color-1', 'color-2'],
    },
  ];

  const panel = createPanel({ series: [createSeries({ metrics })] });
  const panelWithStaticValue = createPanel({
    series: [createSeries({ metrics: staticValueMetric })],
  });
  const panelWithPercentileMetric = createPanel({
    series: [createSeries({ metrics: percentileMetrics })],
  });
  const panelWithPercentileRankMetric = createPanel({
    series: [createSeries({ metrics: percentileRankMetrics })],
  });

  test.each<[string, [Record<number, Layer>, Panel], Array<Partial<XYLayerConfig>>]>([
    [
      'data layer if columns do not include static column',
      [dataSourceLayers, panel],
      [
        {
          layerType: 'data',
          accessors: ['column-id-1'],
          xAccessor: 'column-id-2',
          splitAccessor: 'column-id-3',
          seriesType: 'area',
          layerId: 'test-layer-1',
          yConfig: [
            {
              forAccessor: 'column-id-1',
              axisMode: 'right',
              color: '#68BC00',
            },
          ],
        },
      ],
    ],
    [
      'reference line layer if columns include static column',
      [dataSourceLayersWithStatic, panelWithStaticValue],
      [
        {
          layerType: 'referenceLine',
          accessors: ['column-id-1'],
          layerId: 'test-layer-1',
          yConfig: [
            {
              forAccessor: 'column-id-1',
              axisMode: 'right',
              color: '#68BC00',
              fill: 'below',
            },
          ],
        },
      ],
    ],
    [
      'correct colors if columns include percentile columns',
      [dataSourceLayersWithPercentile, panelWithPercentileMetric],
      [
        {
          yConfig: [
            {
              forAccessor: 'column-id-1',
              axisMode: 'right',
              color: 'color-1',
            },
            {
              forAccessor: 'column-id-2',
              axisMode: 'right',
              color: 'color-2',
            },
          ],
        },
      ],
    ],
    [
      'correct colors if columns include percentile rank columns',
      [dataSourceLayersWithPercentileRank, panelWithPercentileRankMetric],
      [
        {
          yConfig: [
            {
              forAccessor: 'column-id-1',
              axisMode: 'right',
              color: 'color-1',
            },
            {
              forAccessor: 'column-id-2',
              axisMode: 'right',
              color: 'color-2',
            },
          ],
        },
      ],
    ],
  ])('should return %s', (_, input, expected) => {
    expect(getLayers(...input)).toEqual(expected.map(expect.objectContaining));
  });
});
