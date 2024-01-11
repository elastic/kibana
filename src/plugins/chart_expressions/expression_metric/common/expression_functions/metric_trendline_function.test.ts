/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable, ExecutionContext } from '@kbn/expressions-plugin/common';
import { Adapters } from '@kbn/inspector-plugin/common';
import { TrendlineArguments } from '../types';
import { metricTrendlineFunction } from './metric_trendline_function';

const fakeContext = {} as ExecutionContext<Adapters>;
const fakeInput = {} as Datatable;
const metricTrendline = (args: TrendlineArguments) =>
  metricTrendlineFunction().fn(fakeInput, args, fakeContext);

describe('metric trendline function', () => {
  const tableWithBreakdown: Datatable = {
    type: 'datatable',
    columns: [
      {
        id: 'breakdown',
        name: 'Top 5 values of extension.keyword',
        meta: {
          type: 'string',
          field: 'extension.keyword',
          index: 'kibana_sample_data_logs',
          params: {
            id: 'terms',
            params: {
              id: 'string',
              otherBucketLabel: 'Other',
              missingBucketLabel: '(missing value)',
            },
          },
          source: 'esaggs',
          sourceParams: {
            hasPrecisionError: false,
            indexPatternId: '90943e30-9a47-11e8-b64d-95841ca0b247',
            id: '0',
            enabled: true,
            type: 'terms',
            params: {
              field: 'extension.keyword',
              orderBy: '2',
              order: 'desc',
              size: 5,
              otherBucket: true,
              otherBucketLabel: 'Other',
              missingBucket: false,
              missingBucketLabel: '(missing value)',
              includeIsRegex: false,
              excludeIsRegex: false,
            },
            schema: 'segment',
          },
        },
      },
      {
        id: 'time',
        name: 'timestamp per 30 minutes',
        meta: {
          type: 'date',
          field: 'timestamp',
          index: 'kibana_sample_data_logs',
          params: {
            id: 'date',
            params: {
              pattern: 'HH:mm',
            },
          },
          source: 'esaggs',
          sourceParams: {
            hasPrecisionError: false,
            indexPatternId: '90943e30-9a47-11e8-b64d-95841ca0b247',
            appliedTimeRange: {
              from: '2022-09-25T16:00:00.000Z',
              to: '2022-09-26T16:12:41.742Z',
            },
            id: '1',
            enabled: true,
            type: 'date_histogram',
            params: {
              field: 'timestamp',
              timeRange: {
                from: '2022-09-25T16:00:00.000Z',
                to: '2022-09-26T16:12:41.742Z',
              },
              useNormalizedEsInterval: true,
              extendToTimeRange: true,
              scaleMetricValues: false,
              interval: 'auto',
              used_interval: '30m',
              drop_partials: false,
              min_doc_count: 0,
              extended_bounds: {},
            },
            schema: 'segment',
          },
        },
      },
      {
        id: 'metric',
        name: 'Median of byts',
        meta: {
          type: 'number',
          field: 'bytes',
          index: 'kibana_sample_data_logs',
          params: {
            id: 'number',
          },
          source: 'esaggs',
          sourceParams: {
            hasPrecisionError: false,
            indexPatternId: '90943e30-9a47-11e8-b64d-95841ca0b247',
            id: '2',
            enabled: true,
            type: 'median',
            params: {
              field: 'bytes',
            },
            schema: 'metric',
          },
        },
      },
    ],
    rows: [
      {
        breakdown: 'rpm',
        time: 1664121600000,
        metric: null,
      },
      {
        breakdown: 'rpm',
        time: 1664123400000,
        metric: null,
      },
      {
        breakdown: 'rpm',
        time: 1664125200000,
        metric: null,
      },
      {
        breakdown: 'rpm',
        time: 1664127000000,
        metric: null,
      },
      {
        breakdown: 'deb',
        time: 1664121600000,
        metric: null,
      },
      {
        breakdown: 'deb',
        time: 1664123400000,
        metric: 9680,
      },
      {
        breakdown: 'deb',
        time: 1664125200000,
        metric: null,
      },
      {
        breakdown: 'deb',
        time: 1664127000000,
        metric: null,
      },
      {
        breakdown: 'zip',
        time: 1664121600000,
        metric: null,
      },
      {
        breakdown: 'zip',
        time: 1664123400000,
        metric: null,
      },
      {
        breakdown: 'zip',
        time: 1664125200000,
        metric: 5037,
      },
      {
        breakdown: 'zip',
        time: 1664127000000,
        metric: null,
      },
      {
        breakdown: 'zip',
        time: 1664128800000,
        metric: null,
      },
      {
        breakdown: 'css',
        time: 1664121600000,
        metric: 3264,
      },
      {
        breakdown: 'css',
        time: 1664123400000,
        metric: 7215,
      },
      {
        breakdown: 'css',
        time: 1664125200000,
        metric: 9601,
      },
      {
        breakdown: 'css',
        time: 1664127000000,
        metric: 8458,
      },
      {
        breakdown: 'gz',
        time: 1664121600000,
        metric: 3116.5,
      },
      {
        breakdown: 'gz',
        time: 1664123400000,
        metric: null,
      },
      {
        breakdown: 'gz',
        time: 1664125200000,
        metric: 4148,
      },
      {
        breakdown: 'gz',
        time: 1664127000000,
        metric: null,
      },
    ],
    meta: {
      type: 'esaggs',
      source: '90943e30-9a47-11e8-b64d-95841ca0b247',
      statistics: {
        totalCount: 236,
      },
    },
  };

  const tableWithoutBreakdown: Datatable = {
    type: 'datatable',
    columns: [
      {
        id: 'time',
        name: 'timestamp per 30 minutes',
        meta: {
          type: 'date',
          field: 'timestamp',
          index: 'kibana_sample_data_logs',
          params: {
            id: 'date',
            params: {
              pattern: 'HH:mm',
            },
          },
          source: 'esaggs',
          sourceParams: {
            hasPrecisionError: false,
            indexPatternId: '90943e30-9a47-11e8-b64d-95841ca0b247',
            appliedTimeRange: {
              from: '2022-09-25T16:00:00.000Z',
              to: '2022-09-26T16:12:41.742Z',
            },
            id: '1',
            enabled: true,
            type: 'date_histogram',
            params: {
              field: 'timestamp',
              timeRange: {
                from: '2022-09-25T16:00:00.000Z',
                to: '2022-09-26T16:12:41.742Z',
              },
              useNormalizedEsInterval: true,
              extendToTimeRange: true,
              scaleMetricValues: false,
              interval: 'auto',
              used_interval: '30m',
              drop_partials: false,
              min_doc_count: 0,
              extended_bounds: {},
            },
            schema: 'segment',
          },
        },
      },
      {
        id: 'metric',
        name: 'Median of byts',
        meta: {
          type: 'number',
          field: 'bytes',
          index: 'kibana_sample_data_logs',
          params: {
            id: 'number',
          },
          source: 'esaggs',
          sourceParams: {
            hasPrecisionError: false,
            indexPatternId: '90943e30-9a47-11e8-b64d-95841ca0b247',
            id: '2',
            enabled: true,
            type: 'median',
            params: {
              field: 'bytes',
            },
            schema: 'metric',
          },
        },
      },
    ],
    rows: [
      {
        time: 1664121600000,
        metric: null,
      },
      {
        time: 1664123400000,
        metric: null,
      },
      {
        time: 1664125200000,
        metric: null,
      },
      {
        time: 1664127000000,
        metric: null,
      },
    ],
    meta: {
      type: 'esaggs',
      source: '90943e30-9a47-11e8-b64d-95841ca0b247',
      statistics: {
        totalCount: 236,
      },
    },
  };

  it.each(['metric', 'time', 'breakdown'])('checks %s accessor', (accessor) => {
    const table = {
      ...tableWithBreakdown,
      columns: tableWithBreakdown.columns.filter((column) => column.id !== accessor),
    };
    const args = {
      table,
      metric: 'metric',
      timeField: 'time',
      breakdownBy: 'breakdown',
      inspectorTableId: '',
    };

    expect(() => metricTrendline(args)).toThrow();
  });

  it('checks accessors', () => {});

  it('builds trends with breakdown', () => {
    const { trends } = metricTrendline({
      table: tableWithBreakdown,
      metric: 'metric',
      timeField: 'time',
      breakdownBy: 'breakdown',
      inspectorTableId: '',
    });
    expect(trends).toMatchSnapshot();
  });

  it('builds trends without breakdown', () => {
    const { trends } = metricTrendline({
      table: tableWithoutBreakdown,
      metric: 'metric',
      timeField: 'time',
      inspectorTableId: '',
    });
    expect(trends).toMatchSnapshot();
  });

  it('creates inspector information', () => {
    const tableId = 'my-id';

    const { inspectorTable, inspectorTableId } = metricTrendline({
      table: tableWithBreakdown,
      metric: 'metric',
      timeField: 'time',
      breakdownBy: 'breakdown',
      inspectorTableId: tableId,
    });

    expect(inspectorTableId).toBe(tableId);
    expect(inspectorTable).toMatchSnapshot();
  });
});
