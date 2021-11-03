/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import { DatatableColumn, Range } from '../../../../expressions';
import { Render } from '../../../../presentation_util/public/__stories__';
import { ColorMode, ColorSchemas } from '../../../../charts/common';
import { metricVisRenderer } from '../expression_renderers';
import { MetricVisRenderConfig, visType } from '../../common/types';

const config: MetricVisRenderConfig = {
  visType,
  visData: {
    type: 'datatable',
    rows: [{ 'col-0-1': 85, 'col-0-2': 30 }],
    columns: [
      {
        id: 'col-0-1',
        name: 'Max products count',
        meta: { type: 'number', params: {} },
      },
      {
        id: 'col-0-2',
        name: 'Median products count',
        meta: { type: 'number', params: {} },
      },
    ],
  },
  visConfig: {
    metric: {
      percentageMode: false,
      useRanges: false,
      colorSchema: ColorSchemas.GreenToRed,
      metricColorMode: ColorMode.None,
      colorsRange: [],
      labels: { show: true },
      invertColors: false,
      style: {
        bgColor: false,
        bgFill: '#000',
        fontSize: 60,
        labelColor: false,
        subText: '',
      },
    },
    dimensions: {
      metrics: [
        {
          accessor: 0,
          format: {
            id: 'number',
            params: {},
          },
          type: 'vis_dimension',
        },
        {
          accessor: {
            id: 'col-0-2',
            name: 'Median products count',
            meta: { type: 'number' },
          },
          format: {
            id: 'number',
            params: {},
          },
          type: 'vis_dimension',
        },
      ],
    },
  },
};

const dayColumn: DatatableColumn = {
  id: 'col-0-3',
  name: 'Day of the week',
  meta: { type: 'string', params: {} },
};

const dayAccessor: ExpressionValueVisDimension = {
  accessor: {
    id: 'col-0-3',
    name: 'Day of the week',
    meta: { type: 'string' },
  },
  format: {
    id: 'string',
    params: {},
  },
  type: 'vis_dimension',
};

const dataWithBuckets = [
  { 'col-0-1': 85, 'col-0-2': 30, 'col-0-3': 'Monday' },
  { 'col-0-1': 55, 'col-0-2': 32, 'col-0-3': 'Tuesday' },
  { 'col-0-1': 56, 'col-0-2': 52, 'col-0-3': 'Wednesday' },
];

const colorsRange: Range[] = [
  { type: 'range', from: 0, to: 50 },
  { type: 'range', from: 51, to: 150 },
];

const containerSize = {
  width: '700px',
  height: '700px',
};

storiesOf('renderers/visMetric', module)
  .add('Default', () => {
    return <Render renderer={metricVisRenderer} config={config} {...containerSize} />;
  })
  .add('Without labels', () => {
    return (
      <Render
        renderer={metricVisRenderer}
        config={{
          ...config,
          visConfig: {
            ...config.visConfig,
            metric: { ...config.visConfig.metric, labels: { show: false } },
          },
        }}
        {...containerSize}
      />
    );
  })
  .add('With custom font size', () => {
    return (
      <Render
        renderer={metricVisRenderer}
        config={{
          ...config,
          visConfig: {
            ...config.visConfig,
            metric: {
              ...config.visConfig.metric,
              style: { ...config.visConfig.metric.style, fontSize: 120 },
            },
          },
        }}
        {...containerSize}
      />
    );
  })
  .add('With color ranges, background color mode', () => {
    return (
      <Render
        renderer={metricVisRenderer}
        config={{
          ...config,
          visConfig: {
            ...config.visConfig,
            metric: {
              ...config.visConfig.metric,
              colorsRange,
              metricColorMode: ColorMode.Background,
              style: {
                ...config.visConfig.metric.style,
                bgColor: true,
              },
            },
          },
        }}
        {...containerSize}
      />
    );
  })
  .add('With color ranges, labels color mode', () => {
    return (
      <Render
        renderer={metricVisRenderer}
        config={{
          ...config,
          visConfig: {
            ...config.visConfig,
            metric: {
              ...config.visConfig.metric,
              colorsRange,
              metricColorMode: ColorMode.Labels,
              style: {
                ...config.visConfig.metric.style,
                labelColor: true,
              },
            },
          },
        }}
        {...containerSize}
      />
    );
  })
  .add('With color ranges, labels color mode, reverse mode', () => {
    return (
      <Render
        renderer={metricVisRenderer}
        config={{
          ...config,
          visConfig: {
            ...config.visConfig,
            metric: {
              ...config.visConfig.metric,
              colorsRange,
              metricColorMode: ColorMode.Labels,
              style: {
                ...config.visConfig.metric.style,
                labelColor: true,
              },
              invertColors: true,
            },
          },
        }}
        {...containerSize}
      />
    );
  })
  .add('With bucket', () => {
    return (
      <Render
        renderer={metricVisRenderer}
        config={{
          ...config,
          visData: {
            ...config.visData,
            columns: [...config.visData.columns, dayColumn],
            rows: dataWithBuckets,
          },
          visConfig: {
            ...config.visConfig,
            dimensions: { ...config.visConfig.dimensions, bucket: dayAccessor },
          },
        }}
        {...containerSize}
      />
    );
  })
  .add('With empty results', () => {
    return (
      <Render
        renderer={metricVisRenderer}
        config={{ ...config, visData: { ...config.visData, rows: [] } }}
        {...containerSize}
      />
    );
  });
