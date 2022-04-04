/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DataView } from '../../../../data/common';
import type { Panel, Series } from '../../common/types';
import { triggerTSVBtoLensConfiguration } from './';

const dataViewsMap: Record<string, DataView> = {
  test1: { id: 'test1', title: 'test1', timeFieldName: 'timeField1' } as DataView,
  test2: {
    id: 'test2',
    title: 'test2',
    timeFieldName: 'timeField2',
  } as DataView,
  test3: { id: 'test3', title: 'test3', timeFieldName: 'timeField3' } as DataView,
};

const getDataview = (id: string): DataView | undefined => dataViewsMap[id];
jest.mock('../services', () => {
  return {
    getDataViewsStart: jest.fn(() => {
      return {
        getDefault: jest.fn(() => {
          return { id: '12345', title: 'default', timeFieldName: '@timestamp' };
        }),
        get: getDataview,
      };
    }),
  };
});

const model = {
  axis_position: 'left',
  type: 'timeseries',
  index_pattern: { id: 'test2' },
  use_kibana_indexes: true,
  series: [
    {
      color: '#000000',
      chart_type: 'line',
      fill: '0',
      id: '85147356-c185-4636-9182-d55f3ab2b6fa',
      palette: {
        name: 'default',
        type: 'palette',
      },
      split_mode: 'everything',
      metrics: [
        {
          id: '3fa8b32f-5c38-4813-9361-1f2817ae5b18',
          type: 'count',
        },
      ],
      override_index_pattern: 0,
    },
  ],
} as Panel;

describe('triggerTSVBtoLensConfiguration', () => {
  test('should return null for a non timeseries chart', async () => {
    const metricModel = {
      ...model,
      type: 'metric',
    } as Panel;
    const triggerOptions = await triggerTSVBtoLensConfiguration(metricModel);
    expect(triggerOptions).toBeNull();
  });

  test('should return null for a string index pattern', async () => {
    const stringIndexPatternModel = {
      ...model,
      use_kibana_indexes: false,
    };
    const triggerOptions = await triggerTSVBtoLensConfiguration(stringIndexPatternModel);
    expect(triggerOptions).toBeNull();
  });

  test('should return null for a non supported aggregation', async () => {
    const nonSupportedAggModel = {
      ...model,
      series: [
        {
          ...model.series[0],
          metrics: [
            {
              type: 'percentile_rank',
            },
          ] as Series['metrics'],
        },
      ],
    };
    const triggerOptions = await triggerTSVBtoLensConfiguration(nonSupportedAggModel);
    expect(triggerOptions).toBeNull();
  });

  test('should return options for a supported aggregation', async () => {
    const triggerOptions = await triggerTSVBtoLensConfiguration(model);
    expect(triggerOptions).toStrictEqual({
      configuration: {
        extents: { yLeftExtent: { mode: 'full' }, yRightExtent: { mode: 'full' } },
        fill: '0',
        gridLinesVisibility: { x: false, yLeft: false, yRight: false },
        legend: {
          isVisible: false,
          maxLines: 1,
          position: 'right',
          shouldTruncate: false,
          showSingleSeries: false,
        },
      },
      type: 'lnsXY',
      layers: {
        '0': {
          axisPosition: 'left',
          chartType: 'line',
          indexPatternId: 'test2',
          metrics: [
            {
              agg: 'count',
              color: '#000000',
              fieldName: 'document',
              isFullReference: false,
              params: {},
            },
          ],
          palette: {
            name: 'default',
            type: 'palette',
          },
          splitWithDateHistogram: false,
          timeFieldName: 'timeField2',
          timeInterval: 'auto',
          dropPartialBuckets: false,
        },
      },
    });
  });

  test('should return area for timeseries line chart with fill > 0', async () => {
    const modelWithFill = {
      ...model,
      series: [
        {
          ...model.series[0],
          fill: '0.3',
          stacked: 'none',
        },
      ],
    };
    const triggerOptions = await triggerTSVBtoLensConfiguration(modelWithFill);
    expect(triggerOptions?.layers[0].chartType).toBe('area');
  });

  test('should return timeShift in the params if it is provided', async () => {
    const modelWithFill = {
      ...model,
      series: [
        {
          ...model.series[0],
          offset_time: '1h',
        },
      ],
    };
    const triggerOptions = await triggerTSVBtoLensConfiguration(modelWithFill);
    expect(triggerOptions?.layers[0]?.metrics?.[0]?.params?.shift).toBe('1h');
  });

  test('should return filter in the params if it is provided', async () => {
    const modelWithFill = {
      ...model,
      series: [
        {
          ...model.series[0],
          filter: {
            language: 'kuery',
            query: 'test',
          },
        },
      ],
    };
    const triggerOptions = await triggerTSVBtoLensConfiguration(modelWithFill);
    expect(triggerOptions?.layers[0]?.metrics?.[0]?.params?.kql).toBe('test');
  });

  test('should return splitFilters information if the chart is broken down by filters', async () => {
    const modelWithSplitFilters = {
      ...model,
      series: [
        {
          ...model.series[0],
          split_mode: 'filters',
          split_filters: [
            {
              color: 'rgba(188,0,85,1)',
              filter: {
                language: 'kuery',
                query: '',
              },
              id: '89afac60-7d2b-11ec-917c-c18cd38d60b5',
            },
          ],
        },
      ],
    };
    const triggerOptions = await triggerTSVBtoLensConfiguration(modelWithSplitFilters);
    expect(triggerOptions?.layers[0]?.splitFilters).toStrictEqual([
      {
        color: 'rgba(188,0,85,1)',
        filter: {
          language: 'kuery',
          query: '',
        },
        id: '89afac60-7d2b-11ec-917c-c18cd38d60b5',
      },
    ]);
  });

  test('should return termsParams information if the chart is broken down by terms', async () => {
    const modelWithTerms = {
      ...model,
      series: [
        {
          ...model.series[0],
          split_mode: 'terms',
          terms_size: 6,
          terms_direction: 'desc',
          terms_order_by: '_key',
        },
      ] as unknown as Series[],
    };
    const triggerOptions = await triggerTSVBtoLensConfiguration(modelWithTerms);
    expect(triggerOptions?.layers[0]?.termsParams).toStrictEqual({
      size: 6,
      otherBucket: false,
      orderDirection: 'desc',
      orderBy: { type: 'alphabetical' },
      parentFormat: {
        id: 'terms',
      },
    });
  });

  test('should return custom time interval if it is given', async () => {
    const modelWithTerms = {
      ...model,
      interval: '1h',
    };
    const triggerOptions = await triggerTSVBtoLensConfiguration(modelWithTerms);
    expect(triggerOptions?.layers[0]?.timeInterval).toBe('1h');
  });

  test('should return dropPartialbuckets if enabled', async () => {
    const modelWithDropBuckets = {
      ...model,
      drop_last_bucket: 1,
    };
    const triggerOptions = await triggerTSVBtoLensConfiguration(modelWithDropBuckets);
    expect(triggerOptions?.layers[0]?.dropPartialBuckets).toBe(true);
  });

  test('should return the correct chart configuration', async () => {
    const modelWithConfig = {
      ...model,
      show_legend: 1,
      legend_position: 'bottom',
      truncate_legend: 0,
      show_grid: 1,
      series: [{ ...model.series[0], fill: '0.3', separate_axis: 1, axis_position: 'right' }],
    };
    const triggerOptions = await triggerTSVBtoLensConfiguration(modelWithConfig);
    expect(triggerOptions).toStrictEqual({
      configuration: {
        extents: { yLeftExtent: { mode: 'full' }, yRightExtent: { mode: 'full' } },
        fill: '0.3',
        gridLinesVisibility: { x: true, yLeft: true, yRight: true },
        legend: {
          isVisible: true,
          maxLines: 1,
          position: 'bottom',
          shouldTruncate: false,
          showSingleSeries: true,
        },
      },
      type: 'lnsXY',
      layers: {
        '0': {
          axisPosition: 'right',
          chartType: 'area_stacked',
          indexPatternId: 'test2',
          metrics: [
            {
              agg: 'count',
              color: '#000000',
              fieldName: 'document',
              isFullReference: false,
              params: {},
            },
          ],
          palette: {
            name: 'default',
            type: 'palette',
          },
          splitWithDateHistogram: false,
          timeFieldName: 'timeField2',
          timeInterval: 'auto',
          dropPartialBuckets: false,
        },
      },
    });
  });
});
