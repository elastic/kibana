/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { Render } from '../../../../presentation_util/public/__stories__';
import { ColorMode, ColorSchemas } from '../../../../charts/common';
import { metricRenderer } from '../expression_renderers';
import { MetricVisRenderConfig, visType } from '../../common/types';

const config: MetricVisRenderConfig = {
  visType,
  visData: {
    type: 'datatable',
    rows: [{ 'col-0-1': 85, 'col-0-2': 30, 'col-0-3': 12 }],
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
      {
        id: 'col-0-3',
        name: 'Min products count',
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
        {
          accessor: 2,
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

const containerSize = {
  width: '700px',
  height: '700px',
};

storiesOf('renderers/visMetric', module)
  .add('Default', () => {
    return <Render renderer={metricRenderer} config={config} {...containerSize} />;
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
