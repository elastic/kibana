/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AxisMode, VisConfig } from '../types';

export const getVisConfig = (): VisConfig => {
  return {
    markSizeRatio: 5.3999999999999995,
    fittingFunction: 'linear',
    detailedTooltip: true,
    isTimeChart: true,
    showCurrentTime: false,
    showValueLabel: false,
    enableHistogramMode: true,
    tooltip: {
      type: 'vertical',
    },
    aspects: {
      x: {
        accessor: 'col-0-2',
        column: 0,
        title: 'order_date per minute',
        format: {
          id: 'date',
          params: {
            pattern: 'HH:mm',
          },
        },
        aggType: 'date_histogram',
        aggId: '2',
        params: {
          date: true,
          intervalESUnit: 'm',
          intervalESValue: 1,
          interval: 60000,
          format: 'HH:mm',
        },
      },
      y: [
        {
          accessor: 'col-1-3',
          column: 1,
          title: 'Average products.base_price',
          format: {
            id: 'number',
          },
          aggType: 'avg',
          aggId: '3',
          params: {},
        },
      ],
    },
    xAxis: {
      id: 'CategoryAxis-1',
      position: 'bottom',
      show: true,
      style: {
        axisTitle: {
          visible: true,
        },
        tickLabel: {
          visible: true,
          rotation: 0,
        },
      },
      groupId: 'CategoryAxis-1',
      title: 'order_date per minute',
      ticks: {
        show: true,
        showOverlappingLabels: false,
        showDuplicates: false,
      },
      grid: {
        show: false,
      },
      scale: {
        type: 'time',
      },
      integersOnly: false,
    },
    yAxes: [
      {
        id: 'ValueAxis-1',
        position: 'left',
        show: true,
        style: {
          axisTitle: {
            visible: true,
          },
          tickLabel: {
            visible: true,
            rotation: 0,
          },
        },
        groupId: 'ValueAxis-1',
        title: 'Avg of products.base_price',
        ticks: {
          show: true,
          rotation: 0,
          showOverlappingLabels: true,
          showDuplicates: true,
        },
        grid: {
          show: false,
        },
        scale: {
          mode: AxisMode.Percentage,
          type: 'linear',
        },
        domain: {
          min: NaN,
          max: NaN,
        },
        integersOnly: false,
      },
    ],
    legend: {
      show: true,
      position: 'right',
    },
    rotation: 0,
    thresholdLine: {
      color: '#E7664C',
      show: false,
      value: 10,
      width: 1,
      groupId: 'ValueAxis-1',
    },
  };
};

export const getVisConfigMutipleYaxis = (): VisConfig => {
  return {
    markSizeRatio: 5.3999999999999995,
    fittingFunction: 'linear',
    detailedTooltip: true,
    isTimeChart: true,
    showCurrentTime: false,
    showValueLabel: false,
    enableHistogramMode: true,
    tooltip: {
      type: 'vertical',
    },
    aspects: {
      x: {
        accessor: 'col-0-2',
        column: 0,
        title: 'order_date per minute',
        format: {
          id: 'date',
          params: {
            pattern: 'HH:mm',
          },
        },
        aggType: 'date_histogram',
        aggId: '2',
        params: {
          date: true,
          intervalESUnit: 'm',
          intervalESValue: 1,
          interval: 60000,
          format: 'HH:mm',
        },
      },
      y: [
        {
          accessor: 'col-1-3',
          column: 1,
          title: 'Average products.base_price',
          format: {
            id: 'number',
          },
          aggType: 'avg',
          aggId: '3',
          params: {},
        },
        {
          accessor: 'col-1-2',
          column: 1,
          title: 'Average products.taxful_price',
          format: {
            id: 'number',
          },
          aggType: 'avg',
          aggId: '33',
          params: {},
        },
      ],
    },
    xAxis: {
      id: 'CategoryAxis-1',
      position: 'bottom',
      show: true,
      style: {
        axisTitle: {
          visible: true,
        },
        tickLabel: {
          visible: true,
          rotation: 0,
        },
      },
      groupId: 'CategoryAxis-1',
      title: 'order_date per minute',
      ticks: {
        show: true,
        showOverlappingLabels: false,
        showDuplicates: false,
      },
      grid: {
        show: false,
      },
      scale: {
        type: 'time',
      },
      integersOnly: false,
    },
    yAxes: [
      {
        id: 'ValueAxis-1',
        position: 'left',
        show: true,
        style: {
          axisTitle: {
            visible: true,
          },
          tickLabel: {
            visible: true,
            rotation: 0,
          },
        },
        groupId: 'ValueAxis-1',
        title: 'Avg of products.base_price',
        ticks: {
          show: true,
          rotation: 0,
          showOverlappingLabels: true,
          showDuplicates: true,
        },
        grid: {
          show: false,
        },
        scale: {
          mode: AxisMode.Normal,
          type: 'linear',
        },
        domain: {
          min: NaN,
          max: NaN,
        },
        integersOnly: false,
      },
    ],
    legend: {
      show: true,
      position: 'right',
    },
    rotation: 0,
    thresholdLine: {
      color: '#E7664C',
      show: false,
      value: 10,
      width: 1,
      groupId: 'ValueAxis-1',
    },
  };
};

export const getVisConfigPercentiles = (): VisConfig => {
  return {
    markSizeRatio: 5.3999999999999995,
    fittingFunction: 'linear',
    detailedTooltip: true,
    isTimeChart: true,
    showCurrentTime: false,
    showValueLabel: false,
    enableHistogramMode: true,
    tooltip: {
      type: 'vertical',
    },
    aspects: {
      x: {
        accessor: 'col-0-2',
        column: 0,
        title: 'order_date per minute',
        format: {
          id: 'date',
          params: {
            pattern: 'HH:mm',
          },
        },
        aggType: 'date_histogram',
        aggId: '2',
        params: {
          date: true,
          intervalESUnit: 'm',
          intervalESValue: 1,
          interval: 60000,
          format: 'HH:mm',
        },
      },
      y: [
        {
          accessor: 'col-1-3.1',
          column: 1,
          title: '1st percentile of products.base_price',
          format: {
            id: 'number',
          },
          aggType: 'percentiles',
          aggId: '3.1',
          params: {},
        },
        {
          accessor: 'col-2-3.5',
          column: 2,
          title: '5th percentile of products.base_price',
          format: {
            id: 'number',
          },
          aggType: 'percentiles',
          aggId: '3.5',
          params: {},
        },
        {
          accessor: 'col-3-3.25',
          column: 3,
          title: '25th percentile of products.base_price',
          format: {
            id: 'number',
          },
          aggType: 'percentiles',
          aggId: '3.25',
          params: {},
        },
        {
          accessor: 'col-4-3.50',
          column: 4,
          title: '50th percentile of products.base_price',
          format: {
            id: 'number',
          },
          aggType: 'percentiles',
          aggId: '3.50',
          params: {},
        },
        {
          accessor: 'col-5-3.75',
          column: 5,
          title: '75th percentile of products.base_price',
          format: {
            id: 'number',
          },
          aggType: 'percentiles',
          aggId: '3.75',
          params: {},
        },
        {
          accessor: 'col-6-3.95',
          column: 6,
          title: '95th percentile of products.base_price',
          format: {
            id: 'number',
          },
          aggType: 'percentiles',
          aggId: '3.95',
          params: {},
        },
        {
          accessor: 'col-7-3.99',
          column: 7,
          title: '99th percentile of products.base_price',
          format: {
            id: 'number',
          },
          aggType: 'percentiles',
          aggId: '3.99',
          params: {},
        },
      ],
    },
    xAxis: {
      id: 'CategoryAxis-1',
      position: 'bottom',
      show: true,
      style: {
        axisTitle: {
          visible: true,
        },
        tickLabel: {
          visible: true,
          rotation: 0,
        },
      },
      groupId: 'CategoryAxis-1',
      title: 'order_date per minute',
      ticks: {
        show: true,
        showOverlappingLabels: false,
        showDuplicates: false,
      },
      grid: {
        show: false,
      },
      scale: {
        type: 'time',
      },
      integersOnly: false,
    },
    yAxes: [
      {
        id: 'ValueAxis-1',
        position: 'left',
        show: true,
        style: {
          axisTitle: {
            visible: true,
          },
          tickLabel: {
            visible: true,
            rotation: 0,
          },
        },
        groupId: 'ValueAxis-1',
        title: 'Percentiles of products.base_price',
        ticks: {
          show: true,
          rotation: 0,
          showOverlappingLabels: true,
          showDuplicates: true,
        },
        grid: {
          show: false,
        },
        scale: {
          mode: AxisMode.Normal,
          type: 'linear',
        },
        domain: {
          min: NaN,
          max: NaN,
        },
        integersOnly: false,
      },
    ],
    legend: {
      show: true,
      position: 'right',
    },
    rotation: 0,
    thresholdLine: {
      color: '#E7664C',
      show: false,
      value: 10,
      width: 1,
      groupId: 'ValueAxis-1',
    },
  };
};

export const getPercentilesData = () => {
  return [
    {
      'col-0-2': 1610961900000,
      'col-1-3.1': 11.9921875,
      'col-2-3.5': 11.9921875,
      'col-3-3.25': 11.9921875,
      'col-4-3.50': 38.49609375,
      'col-5-3.75': 65,
      'col-6-3.95': 65,
      'col-7-3.99': 65,
    },
    {
      'col-0-2': 1610962980000,
      'col-1-3.1': 28.984375000000004,
      'col-2-3.5': 28.984375,
      'col-3-3.25': 28.984375,
      'col-4-3.50': 30.9921875,
      'col-5-3.75': 41.5,
      'col-6-3.95': 50,
      'col-7-3.99': 50,
    },
    {
      'col-0-2': 1610963280000,
      'col-1-3.1': 11.9921875,
      'col-2-3.5': 11.9921875,
      'col-3-3.25': 11.9921875,
      'col-4-3.50': 12.9921875,
      'col-5-3.75': 13.9921875,
      'col-6-3.95': 13.9921875,
      'col-7-3.99': 13.9921875,
    },
    {
      'col-0-2': 1610964180000,
      'col-1-3.1': 11.9921875,
      'col-2-3.5': 11.9921875,
      'col-3-3.25': 14.9921875,
      'col-4-3.50': 15.98828125,
      'col-5-3.75': 24.984375,
      'col-6-3.95': 85,
      'col-7-3.99': 85,
    },
    {
      'col-0-2': 1610964420000,
      'col-1-3.1': 11.9921875,
      'col-2-3.5': 11.9921875,
      'col-3-3.25': 11.9921875,
      'col-4-3.50': 23.99609375,
      'col-5-3.75': 42,
      'col-6-3.95': 42,
      'col-7-3.99': 42,
    },
    {
      'col-0-2': 1610964600000,
      'col-1-3.1': 10.9921875,
      'col-2-3.5': 10.992187500000002,
      'col-3-3.25': 10.9921875,
      'col-4-3.50': 12.4921875,
      'col-5-3.75': 13.9921875,
      'col-6-3.95': 13.9921875,
      'col-7-3.99': 13.9921875,
    },
  ];
};
