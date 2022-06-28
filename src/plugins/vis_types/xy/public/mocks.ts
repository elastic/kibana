/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { VisParams } from './types';

export const visData = {
  type: 'datatable',
  columns: [
    {
      id: 'col-0-2',
      name: 'timestamp per 12 hours',
      meta: {
        type: 'date',
        field: 'timestamp',
        index: 'kibana_sample_data_logs',
      },
    },
    {
      id: 'col-1-3',
      name: 'Average memory',
      meta: {
        type: 'number',
        field: 'memory',
        index: 'kibana_sample_data_logs',
      },
    },
    {
      id: 'col-2-1',
      name: 'Average bytes',
      meta: {
        type: 'number',
        field: 'bytes',
        index: 'kibana_sample_data_logs',
      },
    },
  ],
  rows: [
    {
      'col-0-2': 1632603600000,
      'col-1-3': 27400,
      'col-2-1': 6079.305555555556,
    },
    {
      'col-0-2': 1632646800000,
      'col-1-3': 148270,
      'col-2-1': 6164.056818181818,
    },
    {
      'col-0-2': 1632690000000,
      'col-1-3': 235280,
      'col-2-1': 6125.469387755102,
    },
    {
      'col-0-2': 1632733200000,
      'col-1-3': 206750,
      'col-2-1': 5362.68306010929,
    },
  ],
} as Datatable;

export const visDataPercentile = {
  type: 'datatable',
  columns: [
    {
      id: 'col-0-1.1',
      name: '1st percentile of bytes',
      meta: {
        type: 'number',
        field: 'bytes',
        index: 'kibana_sample_data_logs',
      },
    },
    {
      id: 'col-1-1.5',
      name: '5th percentile of bytes',
      meta: {
        type: 'number',
        field: 'bytes',
        index: 'kibana_sample_data_logs',
      },
    },
    {
      id: 'col-2-1.25',
      name: '25th percentile of bytes',
      meta: {
        type: 'number',
        field: 'bytes',
        index: 'kibana_sample_data_logs',
      },
    },
    {
      id: 'col-3-1.50',
      name: '50th percentile of bytes',
      meta: {
        type: 'number',
        field: 'bytes',
        index: 'kibana_sample_data_logs',
      },
    },
    {
      id: 'col-4-1.75',
      name: '75th percentile of bytes',
      meta: {
        type: 'number',
        field: 'bytes',
        index: 'kibana_sample_data_logs',
      },
    },
    {
      id: 'col-5-1.95',
      name: '95th percentile of bytes',
      meta: {
        type: 'number',
        field: 'bytes',
        index: 'kibana_sample_data_logs',
      },
    },
    {
      id: 'col-6-1.99',
      name: '99th percentile of bytes',
      meta: {
        type: 'number',
        field: 'bytes',
        index: 'kibana_sample_data_logs',
      },
    },
  ],
  rows: [
    {
      'col-0-1.1': 0,
      'col-1-1.5': 0,
      'col-2-1.25': 1741.5,
      'col-3-1.50': 4677,
      'col-4-1.75': 5681.5,
      'col-5-1.95': 6816,
      'col-6-1.99': 6816,
    },
  ],
} as Datatable;

export const visParamsWithTwoYAxes = {
  type: 'histogram',
  addLegend: true,
  addTooltip: true,
  legendPosition: 'right',
  addTimeMarker: false,
  maxLegendLines: 1,
  truncateLegend: true,
  categoryAxes: [
    {
      type: 'category',
      id: 'CategoryAxis-1',
      show: true,
      position: 'bottom',
      title: {},
      scale: {
        type: 'linear',
      },
      labels: {
        filter: true,
        show: true,
        truncate: 100,
      },
    },
  ],
  labels: {
    type: 'label',
    show: false,
  },
  thresholdLine: {
    type: 'threshold_line',
    show: false,
    value: 10,
    width: 1,
    style: 'full',
    color: '#E7664C',
  },
  valueAxes: [
    {
      type: 'value',
      name: 'LeftAxis-1',
      id: 'ValueAxis-1',
      show: true,
      position: 'left',
      axisType: 'value',
      title: {
        text: 'my custom title',
      },
      scale: {
        type: 'linear',
        mode: 'normal',
        scaleType: 'linear',
      },
      labels: {
        type: 'label',
        filter: true,
        rotate: 0,
        show: true,
        truncate: 100,
      },
    },
    {
      type: 'value',
      name: 'RightAxis-1',
      id: 'ValueAxis-2',
      show: true,
      position: 'right',
      title: {
        text: 'my custom title',
      },
      scale: {
        type: 'linear',
        mode: 'normal',
      },
      labels: {
        filter: true,
        rotate: 0,
        show: true,
        truncate: 100,
      },
    },
  ],
  grid: {
    categoryLines: false,
  },
  seriesParams: [
    {
      type: 'histogram',
      data: {
        label: 'Average memory',
        id: '3',
      },
      drawLinesBetweenPoints: true,
      interpolate: 'linear',
      lineWidth: 2,
      mode: 'stacked',
      show: true,
      showCircles: true,
      circlesRadius: 3,
      seriesParamType: 'histogram',
      valueAxis: 'ValueAxis-2',
    },
    {
      type: 'line',
      data: {
        label: 'Average bytes',
        id: '1',
      },
      drawLinesBetweenPoints: true,
      interpolate: 'linear',
      lineWidth: 2,
      mode: 'stacked',
      show: true,
      showCircles: true,
      circlesRadius: 3,
      valueAxis: 'ValueAxis-1',
    },
  ],
  dimensions: {
    x: {
      type: 'xy_dimension',
      label: 'timestamp per 12 hours',
      aggType: 'date_histogram',
      accessor: 0,
      format: {
        id: 'date',
        params: {
          pattern: 'YYYY-MM-DD HH:mm',
        },
      },
      params: {
        date: true,
      },
    },
    y: [
      {
        label: 'Average memory',
        aggType: 'avg',
        params: {},
        accessor: 1,
        format: {
          id: 'number',
          params: {},
        },
      },
      {
        label: 'Average bytes',
        aggType: 'avg',
        params: {},
        accessor: 2,
        format: {
          id: 'bytes',
          params: {},
        },
      },
    ],
  },
} as unknown as VisParams;
