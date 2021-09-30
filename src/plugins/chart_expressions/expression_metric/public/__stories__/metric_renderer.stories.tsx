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
import { DatatableColumn } from '../../../../expressions';
import { Render } from '../../../../presentation_util/public/__stories__';
import { ColorMode, ColorSchemas } from '../../../../charts/common';
import { metricRenderer } from '../expression_renderers';
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
          accessor: 1,
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
  accessor: 2,
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

storiesOf('renderers/visMetric', module)
  .add('Default', () => {
    return <Render renderer={metricRenderer} config={config} {...containerSize} />;
  })
  .add('With bucket', () => {
    return (
      <Render
        renderer={metricRenderer}
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
        renderer={metricRenderer}
        config={{ ...config, visData: { ...config.visData, rows: [] } }}
        {...containerSize}
      />
    );
  });
