/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { from } from 'rxjs';
import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import { Datatable, DatatableColumn } from '../../../../expressions';
import { Render } from '../../../../presentation_util/public/__stories__';
import { ColorMode, CustomPaletteState } from '../../../../charts/common';
import { getMetricVisRenderer } from '../expression_renderers';
import { MetricStyle, MetricVisRenderConfig, visType } from '../../common/types';

const palette: CustomPaletteState = {
  colors: ['rgb(219 231 38)', 'rgb(112 38 231)', 'rgb(38 124 231)'],
  stops: [0, 50, 150],
  gradient: false,
  rangeMin: 0,
  rangeMax: 150,
  range: 'number',
};

const style: MetricStyle = {
  spec: { fontSize: '12px' },

  /* stylelint-disable */
  type: 'style',
  css: '',
  bgColor: false,
  labelColor: false,
  /* stylelint-enable */
};

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
      metricColorMode: ColorMode.None,
      labels: { show: true },
      percentageMode: false,
      style,
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

const containerSize = {
  width: '700px',
  height: '700px',
};

const metricVisRenderer = getMetricVisRenderer({ theme$: from([{ darkMode: false }]) });

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
              style: {
                ...config.visConfig.metric.style,
                spec: { ...config.visConfig.metric.style.spec, fontSize: '120px' },
              },
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
              palette,
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
              palette,
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
              palette,
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
  .add('With bucket', () => {
    return (
      <Render
        renderer={metricVisRenderer}
        config={{
          ...config,
          visData: {
            ...(config.visData as Datatable),
            columns: [...(config.visData as Datatable).columns, dayColumn],
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
        config={{ ...config, visData: { ...config.visData, rows: [] } as Datatable }}
        {...containerSize}
      />
    );
  });
