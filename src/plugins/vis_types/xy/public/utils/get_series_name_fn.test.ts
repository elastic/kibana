/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { XYChartSeriesIdentifier } from '@elastic/charts';
import { getSeriesNameFn } from './get_series_name_fn';

const aspects = {
  series: [
    {
      accessor: 'col-1-3',
      column: 1,
      title: 'FlightDelayType: Descending',
      format: {
        id: 'terms',
        params: {
          id: 'string',
          otherBucketLabel: 'Other',
          missingBucketLabel: 'Missing',
        },
      },
      aggType: 'terms',
      aggId: '3',
      params: {},
    },
  ],
  x: {
    accessor: 'col-0-2',
    column: 0,
    title: 'timestamp per day',
    format: {
      id: 'date',
      params: {
        pattern: 'YYYY-MM-DD',
      },
    },
    aggType: 'date_histogram',
    aggId: '2',
    params: {
      date: true,
      intervalESUnit: 'd',
      intervalESValue: 1,
      interval: 86400000,
      format: 'YYYY-MM-DD',
    },
  },
  y: [
    {
      accessor: 'col-1-1',
      column: 1,
      title: 'Count',
      format: {
        id: 'number',
      },
      aggType: 'count',
      aggId: '1',
      params: {},
    },
  ],
};

const series = {
  specId: 'histogram-col-1-1',
  seriesKeys: ['col-1-1'],
  yAccessor: 'col-1-1',
  splitAccessors: [],
  smVerticalAccessorValue: '__ECH_DEFAULT_SINGLE_PANEL_SM_VALUE__',
  smHorizontalAccessorValue: '__ECH_DEFAULT_SINGLE_PANEL_SM_VALUE__',
  groupId: '__pseudo_stacked_group-ValueAxis-1__',
  seriesType: 'bar',
  isStacked: true,
} as unknown as XYChartSeriesIdentifier;

const splitAccessors = new Map();
splitAccessors.set('col-1-3', 'Weather Delay');

const seriesSplitAccessors = {
  specId: 'histogram-col-2-1',
  seriesKeys: ['Weather Delay', 'col-2-1'],
  yAccessor: 'col-2-1',
  splitAccessors,
  smVerticalAccessorValue: '__ECH_DEFAULT_SINGLE_PANEL_SM_VALUE__',
  smHorizontalAccessorValue: '__ECH_DEFAULT_SINGLE_PANEL_SM_VALUE__',
  groupId: '__pseudo_stacked_group-ValueAxis-1__',
  seriesType: 'bar',
  isStacked: true,
} as unknown as XYChartSeriesIdentifier;

describe('getSeriesNameFn', () => {
  it('returns the y aspects title if splitAccessors are empty array', () => {
    const getSeriesName = getSeriesNameFn(aspects, false);
    expect(getSeriesName(series)).toStrictEqual('Count');
  });

  it('returns the y aspects title if splitAccessors are empty array but mupliple flag is set to true', () => {
    const getSeriesName = getSeriesNameFn(aspects, true);
    expect(getSeriesName(series)).toStrictEqual('Count');
  });

  it('returns the correct string for multiple set to false and given split accessors', () => {
    const aspectsSplitSeries = {
      ...aspects,
      y: [
        {
          accessor: 'col-2-1',
          column: 2,
          title: 'Count',
          format: {
            id: 'number',
          },
          aggType: 'count',
          aggId: '1',
          params: {},
        },
      ],
    };
    const getSeriesName = getSeriesNameFn(aspectsSplitSeries, false);
    expect(getSeriesName(seriesSplitAccessors)).toStrictEqual('Weather Delay');
  });

  it('returns the correct string for multiple set to true and given split accessors', () => {
    const aspectsSplitSeries = {
      ...aspects,
      y: [
        {
          accessor: 'col-2-1',
          column: 2,
          title: 'Count',
          format: {
            id: 'number',
          },
          aggType: 'count',
          aggId: '1',
          params: {},
        },
      ],
    };
    const getSeriesName = getSeriesNameFn(aspectsSplitSeries, true);
    expect(getSeriesName(seriesSplitAccessors)).toStrictEqual('Weather Delay: Count');
  });
});
